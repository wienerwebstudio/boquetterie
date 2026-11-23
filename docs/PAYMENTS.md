# Zahlungen – Stripe, PayPal und Mock

Die Zahlungsanbieter werden **ausschließlich über Umgebungsvariablen** aktiviert.
Ohne Schlüssel läuft der Shop im Testmodus (Mock-Provider): Bestellungen werden
sofort als bezahlt markiert, es wird nichts abgebucht, und Kasse sowie
Bestellseite zeigen deutlich „Testmodus“.

| Zahlungsart in `content/settings.json` | Provider mit Schlüsseln | Fallback ohne Schlüssel |
|---|---|---|
| `card`, `apple_pay`, `google_pay`, `eps`, `klarna` | Stripe (Payment Element) | Mock |
| `paypal` | PayPal (Orders API v2), sonst **PayPal über Stripe** (Payment Element) | wird **ausgeblendet** |

Eine Zahlungsart erscheint im Checkout nur, wenn sie in den Settings `enabled`
ist **und** ihr Provider konfiguriert ist (`GET /api/payments/methods`).

## Umgebungsvariablen

Lokal in `.env.local` (nie committen), auf dem Server als Secrets.

| Variable | Pflicht für | Beschreibung |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe | Server-Schlüssel `sk_test_…` / `sk_live_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | Browser-Schlüssel `pk_test_…` / `pk_live_…` (wird an den Client gegeben) |
| `STRIPE_WEBHOOK_SECRET` | Stripe-Webhook | Signing Secret `whsec_…` des Endpoints `/api/webhooks/stripe` |
| `PAYPAL_CLIENT_ID` | PayPal | Client-ID der REST-App |
| `PAYPAL_CLIENT_SECRET` | PayPal | Secret der REST-App |
| `PAYPAL_ENV` | optional | `sandbox` (Standard) oder `live` |
| `PAYPAL_WEBHOOK_ID` | optional | Webhook-ID aus dem PayPal-Dashboard – aktiviert die Signaturprüfung von `/api/webhooks/paypal`. Ohne ID werden Webhooks in Produktion ignoriert. |
| `NEXT_PUBLIC_SITE_URL` | empfohlen | Absolute Basis-URL (z. B. `https://blumora.at`) für Rücksprung-URLs. Fehlt sie, wird in Entwicklung der Request-Origin, in Produktion `seo.siteUrl` aus den Settings verwendet. |

Alle Secrets bleiben serverseitig (`server-only`-Module unter `src/lib/payments*`).
Beträge kommen immer aus der serverseitig berechneten Bestellung, nie vom Client.

## Ablauf

1. `POST /api/orders` validiert alles, **reserviert Lagerbestand**, speichert die
   Bestellung mit `status: received`, `payment.status: pending` und startet die
   Zahlung beim Provider. Antwort: `{ id, token, total, payment: { provider, clientSecret?, approveUrl? } }` (`total` = Server-Betrag).
2. **Mock** – sofort `paid`, History-Eintrag „Testzahlung (mock)“. Nur in Entwicklung oder mit `PAYMENTS_ALLOW_MOCK=true` (E2E-Tests); ein Produktions-Build ohne Stripe-Schlüssel bietet Karte/Apple Pay/Google Pay gar nicht an, statt Bestellungen ohne Zahlung als bezahlt zu markieren.
3. **Stripe – ein Schritt:** Bestellung anlegen und bezahlen passiert auf **einem**
   Bildschirm (Kasse Schritt 5, Angebotsseite). Die eigene Zahlarten-Liste bleibt; unter
   der **gewählten** Zahlart zeigt Stripe das Payment Element direkt an (Kreditkarte →
   Kartenfelder, Apple Pay / Google Pay → nur diese Wallet, Klarna/EPS → Hinweis auf die
   Weiterleitung). Elements laufen im „deferred“-Modus: `mode: "payment"`, Betrag = die in
   der Kasse angezeigte Summe in Cent (nur Anzeige), `currency: "eur"`,
   `allowedPaymentMethodTypes` = Stripe-Typ der Zahlart (Apple/Google Pay = `card` mit
   nur dieser Wallet, `wallets`-Option). Schrift im Stripe-Feld: Manrope (Google Fonts via
   `fonts`, `appearance.variables.fontFamily`). Logik: `src/components/checkout/pay-logic.ts`,
   Feld: `stripe-inline.tsx`.

   „Jetzt kaufen“ macht der Reihe nach:
   1. `elements.submit()` – **synchron im Klick** (Apple Pay braucht die Nutzergeste),
      prüft die Eingaben, öffnet ggf. das Wallet-Fenster. **Gleichzeitig** (nicht danach)
      startet
   2. `POST /api/orders` (mit `draftId`, siehe „Abgebrochene Kasse“) – der Server berechnet
      alle Beträge selbst, legt die Bestellung an und erstellt den PaymentIntent
      (`automatic_payment_methods`, Metadata `orderId`, `receipt_email`). Antwort mit
      `total` (Server-Betrag). Die Bestellung entsteht **immer**, auch wenn `submit()`
      scheitert (Kartenfelder leer, Apple-/Google-Pay-Fenster geschlossen): Sie bleibt
      `pending` („Nicht bezahlt“ im Admin, mit allen Kontaktdaten), der Browser schreibt
      über `POST /api/orders/payment-note { orderId, token, reason, method, detail }`
      (Rate-Limit 20/10 min, Token-Prüfung, nur unbezahlte Bestellungen, max. 10 je
      Bestellung) „Zahlung nicht abgeschlossen: Kartenangaben unvollständig“ bzw.
      „… Apple-Pay-Fenster geschlossen“ in den Verlauf (Einordnung aus Stripe-Fehlertyp/-code:
      `src/lib/payment-note.ts`), die Kundin sieht Stripes Meldung wie bisher, und ein neuer
      Klick nutzt dieselbe Bestellung (siehe „Kein doppelter Auftrag“). PayPal und Mock
      verhalten sich unverändert.
   3. Weicht `total` vom angezeigten Betrag ab (Gutschein, Liefergebühr geändert), wird
      **nicht** bestätigt: Hinweis „Der Gesamtbetrag beträgt jetzt …“, Elements zeigen den
      neuen Betrag, die Kundin tippt erneut (dieselbe Bestellung wird weiterverwendet).
   4. `stripe.confirmPayment({ elements, clientSecret, confirmParams: { return_url },
      redirect: "if_required" })`, danach `POST /api/payments/stripe/confirm { orderId, token }`
      – der Server liest den Intent selbst und markiert bei `succeeded` als bezahlt
      (idempotent) – und die Statusseite.
      Redirect-Methoden (EPS, Klarna, 3-D Secure) landen auf
      `/checkout/rueckkehr?orderId&token`, das dieselbe Bestätigung auslöst.

   **Sicherheitsnetze:** Lässt sich Stripe.js nicht laden (Blocker, Netz) oder erscheint
   das Feld nach 20 s nicht, steht ein Hinweis da (neu laden, anderer Browser, andere
   Zahlart) – es wird **keine** Bestellung angelegt. Lehnt Stripe die Bestätigung als
   Integrationsfehler ab (`invalid_request_error`), wird das klassische Payment Element für
   den **bestehenden** Intent gezeigt (`clientSecret`-Modus) – die Bestellung bleibt dieselbe.

4. **PayPal** – PayPal-Order via REST, Kunde wird zur `approveUrl` geleitet.
   Rücksprung `GET /api/payments/paypal/return?orderId&token` captured serverseitig,
   markiert als bezahlt und leitet auf `/bestellung/{id}?token&neu=1`.
   Abbruch: `GET /api/payments/paypal/cancel` → Bestand wird freigegeben,
   Zahlung `failed`, zurück zu `/checkout?cancelled=1` (Formular bleibt erhalten).
5. **Webhooks** sind die Wahrheit für asynchrone Ereignisse:
   - Stripe `payment_intent.succeeded` → bezahlt, `payment_intent.payment_failed` → `failed` (+ Bestand zurück), `charge.refunded` → `refunded`.
   - PayPal `PAYMENT.CAPTURE.COMPLETED` / `DENIED` / `REFUNDED` analog.
   Mehrfaches „bezahlt“ (Confirm + Webhook) erzeugt **keine** doppelten History-Einträge oder Mails.

Die Bestellbestätigung per E-Mail geht erst raus, wenn die Zahlung bestätigt ist.

### Absicherung im Browser (Stripe)

- **Nur Zahlungsarten, die es wirklich gibt:** `/api/payments/methods` fragt die Stripe-Zahlungsmethoden-Konfiguration ab (5 Min. Cache) und blendet Arten aus, die dort nicht verfügbar sind (z. B. Klarna ausgeschaltet oder pausiert). Der Browser blendet zusätzlich Apple Pay ohne `ApplePaySession` (z. B. Chrome auf dem iPhone) und Google Pay auf iOS aus. Schlägt die Abfrage fehl, bleibt alles wie bisher sichtbar. **Bei einem eingeschränkten Schlüssel (`rk_live_…`) braucht dieser die Berechtigung „Payment Method Configurations: Read“** (Stripe → Entwickler → API-Schlüssel → Schlüssel bearbeiten), sonst steht im Function-Log „payment method availability unavailable … Permission denied“.
- **Kein doppelter Auftrag bei einem neuen Versuch:** Schlägt die Zahlung fehl, bricht die Kundin ab (auch nach einer Klarna-/EPS-Weiterleitung) oder wechselt sie nur die Zahlart, nutzt die Kasse dieselbe Bestellung und denselben PaymentIntent weiter, solange Warenkorb und Angaben gleich sind. Die Bestellung bleibt bis dahin `pending`. Die Sitzung merkt sich Bestellnummer + Token (sessionStorage `blumora-stripe-attempt:checkout`, ohne Client-Secret); nach einem Neuladen holt `POST /api/orders/resume` das Client-Secret desselben Intents (`resumeCheckoutOrder` in `src/lib/orders.ts`). Ist der Intent nicht mehr bezahlbar, wird die alte Bestellung als fehlgeschlagen markiert (Bestand frei) und eine neue angelegt. Angebote nutzen die eigene Wiederverwendung von `/api/offers/pay`.
- **Fehler werden gemeldet:** Lädt das Zahlungsfeld bei einem erneuten Versuch einer bestehenden Bestellung nicht (`loaderror`) oder nach 20 s noch nicht, oder liefert „Jetzt kaufen“ einen Fehler (außer unvollständigen Eingaben), meldet der Browser das an `POST /api/payments/stripe/client-event`. Das steht als „Zahlungsproblem im Browser: …“ (mit Gerät) im Verlauf der Bestellung (max. 5 je Bestellung), und `MAIL_ADMIN` bekommt beim ersten Problem einer Bestellung die Mail „Zahlung hängt: BQ-… · Betrag“ mit den Kontaktdaten. Die Kundin sieht einen Hinweis mit ihrer Bestellnummer (neu laden, anderer Browser, uns kontaktieren).

## Express-Kauf (entfernt)

Bis 23.11.2026 gab es im Warenkorb einen Express-Kauf (Stripe Express Checkout Element:
Apple Pay / Google Pay / Link, Lieferadresse aus der Wallet). Entfernt auf Wunsch der Inhaber:
Blumen sind fast immer Geschenke – die Empfängeradresse im Wallet-Fenster einzutippen ist
umständlicher als im Checkout, landet dauerhaft im Apple-Konto der Kundin, und die Wallet
liefert keine Empfänger-Telefonnummer, keinen Kartentext und keine Hinweise. Apple Pay und
Google Pay bleiben in der Kasse (Schritt 5). Alte Einträge „Abgebrochene Kasse“ mit Quelle
`express` werden im Admin weiter angezeigt.

## Abgebrochene Kasse

Wunsch der Inhaber: Auch nicht erfolgreiche Bestellungen sollen im Admin sichtbar sein –
mit den Kontaktdaten, egal wie weit die Kundin gekommen ist.

- **Bestellung angelegt, Zahlung nicht fertig** (Karte abgelehnt, Fenster geschlossen,
  Felder leer, Klarna abgebrochen): steht unter Admin → Bestellungen → „Nicht bezahlt“
  (grau), Grund im Verlauf.
- **Keine Bestellung, aber Kontaktdaten** („Abgebrochene Kasse“): Sobald Schritt 4
  (Kontaktdaten) abgeschlossen ist – und erneut beim Betreten von Schritt 5 (z. B. nach
  Neuladen oder geänderten Angaben) – schickt die Kasse eine Momentaufnahme an
  `POST /api/checkout/draft` (Rate-Limit 30/10 min, max. 16 KB, Honeypot-Feld `website`):
  Besteller (Name, E-Mail, Telefon), Warenkorb (`items` wie bei der Bestellung),
  Empfängeradresse, Liefertag und Zeitfenster, Sprache. Gespeichert wird nur mit gültiger
  E-Mail **oder** Telefonnummer. Der Server nimmt Namen und Preise aus dem Katalog und
  schätzt die Summe (`priceOrder`: inkl. Lieferung/Gutschein, sonst nur Waren – Hinweis
  „ohne Lieferung“). Schlüssel ist eine zufällige ID pro Browser-Sitzung
  (sessionStorage `blumora-checkout-draft:checkout`), mehrfaches Senden aktualisiert
  denselben Eintrag.
- **Express-Kauf:** Schließt die Kundin das Apple-/Google-Pay-Fenster (`cancel` des Express
  Checkout Element), entsteht ein Eintrag mit Produkt/Warenkorb, Liefertag, Zeitfenster und
  PLZ (Auswahl über den Buttons bzw. die anonymisierte Adresse aus `shippingaddresschange`:
  PLZ, Ort, Land). Apple/Google geben Name, E-Mail und Telefon erst beim Bezahlen frei –
  der Admin zeigt dann „Express – keine Kontaktdaten (Apple/Google geben sie erst beim
  Bezahlen frei)“. Wurde die Zahlung im Wallet bestätigt, aber die Bestellung konnte nicht
  angelegt werden (Adresse ungültig, Verbindung), enthält der Eintrag die freigegebenen
  Kontaktdaten.
- **Aufräumen:** Wird aus derselben Sitzung eine Bestellung angelegt, schickt der Browser
  `draftId` mit (`/api/orders`), und der Server löscht den Eintrag –
  die Bestellung zeigt die Daten dann selbst. Einträge älter als **30 Tage** werden beim
  Öffnen der Liste und vom stündlichen Cron (`/api/cron/stale-orders`) gelöscht; höchstens
  1000 Einträge (die ältesten fallen weg). Im Admin: Bestellungen → Filter „Abgebrochene
  Kasse“ mit Kontakt, Warenkorb, Summe (ca.), Liefertag/Zeitfenster und „Löschen“.
- **Speicher:** nur über `src/lib/cms.ts` (`getCheckoutDrafts`/`saveCheckoutDrafts`,
  Laufzeitdokument `checkout-drafts`: `data/checkout-drafts.json` bzw. Postgres-Tabelle
  `documents`). Logik in `src/lib/checkout-drafts.ts`.
- **Datenschutz:** Die Datenschutzerklärung muss die Speicherung dieser Kontaktdaten aus
  nicht abgeschlossenen Bestellungen (Zweck: Rückfrage/Hilfe bei der Bestellung,
  Speicherdauer 30 Tage) erwähnen. Das ist ein rechtlicher Text – von den Inhabern bzw.
  ihrer Beratung zu ergänzen, nicht automatisch geändert.

## Lagerbestand

`product.stock` und `sizes[].stock` (wenn nicht `null`/`undefined`) werden beim
Anlegen der Bestellung verringert – innerhalb einer prozessweiten Sperre, damit
zwei gleichzeitige Bestellungen nicht dieselben Einheiten bekommen. Bei
fehlgeschlagener oder abgebrochener Zahlung wird der Bestand zurückgebucht.

**Unbezahlte Bestellungen aufräumen:** `GET|POST /api/cron/stale-orders` (stündlich,
`CRON_SECRET`, Netlify-Function `cron-stale-orders`, siehe `docs/DEPLOYMENT.md`) und der
Button „Unbezahlte jetzt bereinigen“ unter Admin → Bestellungen markieren jede Bestellung,
deren Zahlung **2 Stunden nach der letzten Aktivität** (Anlage oder letzter Verlaufseintrag)
noch `pending` ist, als fehlgeschlagen – Notiz „Zahlung abgebrochen (nach 2 Std.
automatisch)“, Bestand wird über `markOrderPaymentFailed` genau einmal freigegeben
(`src/lib/stale-orders.ts`). Stripe-Bestellungen werden vorher bei Stripe nachgesehen (nur
lesend, wenn Stripe konfiguriert ist): `succeeded` → stattdessen als bezahlt markiert,
`processing` oder Stripe nicht erreichbar → bleibt bis zum nächsten Lauf. Bezahlte,
erstattete oder bereits fehlgeschlagene Bestellungen werden nie angefasst. Der Intent wird
nicht storniert: Kommt die Zahlung doch noch (Webhook, Rücksprung), markiert
`markOrderPaid` die Bestellung als bezahlt und reserviert den Bestand erneut.

Bekannte Grenzen:
- Bis zum nächsten Lauf (max. ca. 3 Std. nach dem Abbruch) halten unbezahlte
  Bestellungen ihre Reservierung. Ohne `CRON_SECRET` läuft die Aufräumroutine nur über
  den Admin-Button.
- Eine Stornierung im Admin gibt den Bestand derzeit nicht automatisch zurück.
- Die Sperre gilt nur innerhalb eines Node-Prozesses (wie der Rate-Limiter).

## Stripe einrichten

1. Dashboard → Developers → API keys: `STRIPE_SECRET_KEY` und `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` setzen.
   **Für Live statt des Secret Keys (`sk_…`) einen eingeschränkten Schlüssel (`rk_…`) verwenden**
   mit diesen Rechten: *PaymentIntents* – Schreiben, *Charges* – Lesen,
   *Checkout Sessions* – Schreiben (nur fürs Blumen-Abo), alles andere *Keine*.
   Schlüssel nur in den Netlify-Umgebungsvariablen speichern, nie im Code.
2. **Zahlungsmethoden** (Settings → Payment methods): *Cards*, *EPS*, *Klarna*,
   *Apple Pay* und *Google Pay* aktivieren. Da der PaymentIntent
   `automatic_payment_methods` nutzt, erscheinen alle im Dashboard aktivierten
   Methoden automatisch im Payment Element (Wallets nur auf unterstützten
   Geräten/Browsern). **Link** eingeschaltet lassen (schnellere Wiederholungskäufe).
   Methoden ohne Bezug zu Österreich (z. B. MB WAY) im Dashboard ausschalten.
   Niemals `payment_method_types` im Code setzen – ab API-Version 2026-10-28 lehnt
   Stripe den Parameter ab.
3. **Apple Pay**: Settings → Payment methods → Apple Pay → Domain hinzufügen
   (`blumora.at`). Stripe hostet die Domain-Verifizierungsdatei unter
   `/.well-known/apple-developer-merchantid-domain-association` automatisch,
   solange Stripe.js von der Domain geladen wird; andernfalls die Datei aus dem
   Dashboard unter `public/.well-known/` ablegen.
4. **Webhook** (Developers → Webhooks → Add endpoint):
   URL `https://<domain>/api/webhooks/stripe`, Events
   `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`,
   `charge.dispute.created`. Signing Secret als `STRIPE_WEBHOOK_SECRET` setzen.
   Ein Zahlungsstreit (Chargeback) ändert die Bestellung nicht, sondern schickt eine
   Mail mit Antwortfrist an `MAIL_ADMIN` – beantwortet wird im Stripe-Dashboard.

### Umsatzsteuer / Stripe Tax

Blumora ist Kleinunternehmer (§ 6 Abs. 1 Z 27 UStG) und verrechnet keine
Umsatzsteuer. Stripe Tax ist deshalb **nicht** aktiv, und die Seite zeigt
„Endpreis“ statt „inkl. MwSt.“ (`src/lib/vat.ts`). Wird die Umsatzgrenze
überschritten:

1. Im Dashboard (Tax → Registrations) die österreichische Registrierung anlegen.
2. Produktsteuercodes festlegen (Schnittblumen und Pflanzen voraussichtlich
   ermäßigter Satz, Zubehör Normalsatz – mit dem Steuerberater klären).
3. Steuer für den eigenen Checkout über die Tax Calculation API berechnen und
   den Betrag in den PaymentIntent übernehmen; Preise bleiben Endpreise
   (`tax_behavior: inclusive`).
4. `SMALL_BUSINESS` in `src/lib/vat.ts` auf `false` setzen.

Ohne aktive Registrierung berechnet Stripe Tax keine Steuer, auch wenn es
eingeschaltet ist.

### Lokal testen

```bash
stripe login        # oder: export STRIPE_API_KEY=sk_test_…
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# → gibt ein whsec_… aus: als STRIPE_WEBHOOK_SECRET in .env.local eintragen, Dev-Server neu starten
stripe trigger payment_intent.succeeded   # optional: Test-Event
```

Testkarten (Testmodus, beliebiges Ablaufdatum in der Zukunft, beliebige CVC):

| Karte | Verhalten |
|---|---|
| `4242 4242 4242 4242` | Erfolg |
| `4000 0025 0000 3155` | 3-D Secure Authentifizierung nötig |
| `4000 0000 0000 9995` | Abgelehnt (insufficient funds) |
| `4000 0000 0000 0002` | Abgelehnt (generic decline) |

Zahlungsstreit testen: einen PaymentIntent mit `pm_card_createDispute` bestätigen
(`stripe trigger charge.dispute.created` funktioniert mit API-Version
2026-10-28 nicht mehr, weil die Fixture `payment_method_types` verwendet).

EPS und Klarna zeigen im Testmodus eine Stripe-Simulationsseite, auf der man
„Authorize“ oder „Fail“ wählen kann – der Rücksprung landet auf `/checkout/rueckkehr`.

### Blumen-Abo (Stripe Checkout)

Ist Stripe konfiguriert, zeigt `/blumen-abo` einen Button **„Abo abschließen“**.
`POST /api/payments/stripe/subscription { planId, frequencyId }` erstellt eine
Checkout Session im Modus `subscription` mit Inline-Preis: Planpreis aus
`content/subscription.json` minus Rhythmus-Rabatt, Intervall
`weekly` → wöchentlich, `biweekly` → alle 2 Wochen, `monthly` → monatlich
(die Frequenz-IDs müssen so heißen). Erfolg: `/blumen-abo?abo=erfolg`, Abbruch: `/blumen-abo`.
Ohne Stripe bleibt das bisherige Anfrageformular.

## PayPal einrichten

**Weg A – PayPal über Stripe (aktiv, keine eigenen Schlüssel):** PayPal im
Stripe-Dashboard unter Zahlungsmethoden aktivieren, dann im Admin unter
Einstellungen → Zahlungsarten „PayPal“ einschalten. Ohne `PAYPAL_CLIENT_ID`
läuft PayPal dann wie Klarna/eps über das Stripe Payment Element (Weiterleitung
zu PayPal, Rücksprung, Stripe-Webhook). `/api/payments/methods` blendet PayPal
aus, solange Stripe es nicht anbietet. Erstattungen laufen im Stripe-Dashboard.

**Weg B – direkte PayPal-REST-App** (hat Vorrang, sobald `PAYPAL_CLIENT_ID` und
`PAYPAL_CLIENT_SECRET` gesetzt sind):

1. developer.paypal.com → Apps & Credentials → REST-App anlegen (Sandbox zum
   Testen). `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV=sandbox`.
2. In `content/settings.json` die Zahlungsart `paypal` auf `enabled: true` setzen.
3. Optional Webhook: App → Webhooks → URL `https://<domain>/api/webhooks/paypal`,
   Events `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`,
   `PAYMENT.CAPTURE.REFUNDED`. Die Webhook-ID als `PAYPAL_WEBHOOK_ID` setzen.
   Der Rücksprung captured bereits serverseitig – der Webhook ist nur für
   Erstattungen/Reviews nötig.
4. Sandbox-Testkäufer unter Sandbox → Accounts anlegen und damit im Checkout bezahlen.

## Live gehen

1. Stripe: Live-Schlüssel (`rk_live_…` eingeschränkt, `pk_live_…`) setzen, Live-Webhook-Endpoint
   anlegen und dessen `whsec_…` als `STRIPE_WEBHOOK_SECRET` verwenden.
   Zahlungsmethoden und Apple-Pay-Domain im **Live**-Modus erneut aktivieren.
2. PayPal: Live-App-Credentials, `PAYPAL_ENV=live`, Live-Webhook-ID.
3. `NEXT_PUBLIC_SITE_URL=https://blumora.at` setzen (Rücksprung-URLs).
4. In `content/settings.json` nur die Zahlungsarten aktivieren, die wirklich
   angeboten werden sollen.
5. Testbestellung mit kleinem Betrag durchführen und im Admin prüfen:
   `payment.status: paid`, `provider: stripe|paypal`, Referenz vorhanden.
6. Rate-Limits: `POST /api/orders` 10/10 min pro IP, Confirm/Return 30/10 min.
   Für mehrere Instanzen den Store in `src/lib/rate-limit.ts` durch Redis ersetzen.

## Endpunkte

| Route | Zweck |
|---|---|
| `GET /api/payments/methods` | verfügbare Zahlungsarten + Publishable Key + Abo-Checkout-Flag |
| `POST /api/orders` | Bestellung anlegen, Zahlung starten (Antwort mit Server-`total`) |
| `POST /api/orders/resume` | offene Stripe-Bestellung derselben Sitzung fortsetzen (Token, Rate-Limit) |
| `POST /api/payments/stripe/client-event` | Browser meldet Zahlungsproblem (Token, Rate-Limit) → Verlauf + Mail an `MAIL_ADMIN` |
| `POST /api/payments/stripe/confirm` | Intent serverseitig prüfen, Bestellung als bezahlt markieren |
| `POST /api/payments/stripe/subscription` | Checkout Session fürs Blumen-Abo |
| `GET /api/payments/paypal/return` | PayPal-Rücksprung: capture + bezahlt |
| `GET /api/payments/paypal/cancel` | PayPal-Abbruch: Bestand freigeben |
| `POST /api/webhooks/stripe` | Stripe-Webhook (Raw Body, Signatur) |
| `POST /api/webhooks/paypal` | PayPal-Webhook (optional, Signatur via `PAYPAL_WEBHOOK_ID`) |
