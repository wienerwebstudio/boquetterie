# Zahlungen – Stripe, PayPal und Mock

Die Zahlungsanbieter werden **ausschließlich über Umgebungsvariablen** aktiviert.
Ohne Schlüssel läuft der Shop im Testmodus (Mock-Provider): Bestellungen werden
sofort als bezahlt markiert, es wird nichts abgebucht, und Kasse sowie
Bestellseite zeigen deutlich „Testmodus“.

| Zahlungsart in `content/settings.json` | Provider mit Schlüsseln | Fallback ohne Schlüssel |
|---|---|---|
| `card`, `apple_pay`, `google_pay`, `eps`, `klarna` | Stripe (Payment Element) | Mock |
| `paypal` | PayPal (Orders API v2) | wird **ausgeblendet** |

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
| `NEXT_PUBLIC_SITE_URL` | empfohlen | Absolute Basis-URL (z. B. `https://bloomery.at`) für Rücksprung-URLs. Fehlt sie, wird in Entwicklung der Request-Origin, in Produktion `seo.siteUrl` aus den Settings verwendet. |

Alle Secrets bleiben serverseitig (`server-only`-Module unter `src/lib/payments*`).
Beträge kommen immer aus der serverseitig berechneten Bestellung, nie vom Client.

## Ablauf

1. `POST /api/orders` validiert alles, **reserviert Lagerbestand**, speichert die
   Bestellung mit `status: received`, `payment.status: pending` und startet die
   Zahlung beim Provider. Antwort: `{ id, token, payment: { provider, clientSecret?, approveUrl? } }`.
2. **Mock** – sofort `paid`, History-Eintrag „Testzahlung (mock)“.
3. **Stripe** – PaymentIntent (`automatic_payment_methods`, Metadata `orderId`,
   `receipt_email`). Der Browser bestätigt mit dem Payment Element
   (`stripe.confirmPayment`, `redirect: "if_required"`). Danach ruft der Client
   `POST /api/payments/stripe/confirm { orderId, token }` auf – der Server liest
   den Intent selbst und markiert bei `succeeded` als bezahlt (idempotent).
   Redirect-Methoden (EPS, Klarna, 3-D Secure) landen auf
   `/checkout/rueckkehr?orderId&token`, das dieselbe Bestätigung auslöst.
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

## Lagerbestand

`product.stock` und `sizes[].stock` (wenn nicht `null`/`undefined`) werden beim
Anlegen der Bestellung verringert – innerhalb einer prozessweiten Sperre, damit
zwei gleichzeitige Bestellungen nicht dieselben Einheiten bekommen. Bei
fehlgeschlagener oder abgebrochener Zahlung wird der Bestand zurückgebucht.

Bekannte Grenzen:
- Verlassene, nie bezahlte Stripe-Bestellungen bleiben `pending` und behalten die
  Reservierung, bis ein `payment_failed`-Webhook eintrifft oder das Team die
  Bestellung storniert. Stripe bricht unbestätigte Intents nicht automatisch ab
  (kein 24-h-Timeout) – bei Bedarf eine Aufräumroutine ergänzen.
- Eine Stornierung im Admin gibt den Bestand derzeit nicht automatisch zurück.
- Die Sperre gilt nur innerhalb eines Node-Prozesses (wie der Rate-Limiter).

## Stripe einrichten

1. Dashboard → Developers → API keys: `STRIPE_SECRET_KEY` und `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` setzen.
2. **Zahlungsmethoden** (Settings → Payment methods): *Cards*, *EPS*, *Klarna*,
   *Apple Pay* und *Google Pay* aktivieren. Da der PaymentIntent
   `automatic_payment_methods` nutzt, erscheinen alle im Dashboard aktivierten
   Methoden automatisch im Payment Element (Wallets nur auf unterstützten
   Geräten/Browsern).
3. **Apple Pay**: Settings → Payment methods → Apple Pay → Domain hinzufügen
   (`bloomery.at`). Stripe hostet die Domain-Verifizierungsdatei unter
   `/.well-known/apple-developer-merchantid-domain-association` automatisch,
   solange Stripe.js von der Domain geladen wird; andernfalls die Datei aus dem
   Dashboard unter `public/.well-known/` ablegen.
4. **Webhook** (Developers → Webhooks → Add endpoint):
   URL `https://<domain>/api/webhooks/stripe`, Events
   `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`.
   Signing Secret als `STRIPE_WEBHOOK_SECRET` setzen.

### Lokal testen

```bash
stripe login
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

1. Stripe: Live-Schlüssel (`sk_live_…`, `pk_live_…`) setzen, Live-Webhook-Endpoint
   anlegen und dessen `whsec_…` als `STRIPE_WEBHOOK_SECRET` verwenden.
   Zahlungsmethoden und Apple-Pay-Domain im **Live**-Modus erneut aktivieren.
2. PayPal: Live-App-Credentials, `PAYPAL_ENV=live`, Live-Webhook-ID.
3. `NEXT_PUBLIC_SITE_URL=https://bloomery.at` setzen (Rücksprung-URLs).
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
| `POST /api/orders` | Bestellung anlegen, Zahlung starten |
| `POST /api/payments/stripe/confirm` | Intent serverseitig prüfen, Bestellung als bezahlt markieren |
| `POST /api/payments/stripe/subscription` | Checkout Session fürs Blumen-Abo |
| `GET /api/payments/paypal/return` | PayPal-Rücksprung: capture + bezahlt |
| `GET /api/payments/paypal/cancel` | PayPal-Abbruch: Bestand freigeben |
| `POST /api/webhooks/stripe` | Stripe-Webhook (Raw Body, Signatur) |
| `POST /api/webhooks/paypal` | PayPal-Webhook (optional, Signatur via `PAYPAL_WEBHOOK_ID`) |
