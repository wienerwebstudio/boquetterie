# Individuelle Angebote

Admin → **Angebote**: persönliche Angebote mit sofortiger Online-Zahlung – private Bezahlseiten, die nur die Kund:in kennt. Beispiel: ein Strauß nur aus rosa Tulpen, am 29.11. von 14–16 Uhr an einen Treffpunkt (Haupteingang Burgtheater) – Preis inkl. Lieferung, bezahlt per Link.

## Ablauf

1. **Anlegen** (`/admin/angebote/neu`): Kund:in (Name, E-Mail, Telefon, Sprache = jede Live-Sprache), Positionen, Extras, Lieferung, Hinweise, „Gültig bis“ (Standard heute + 3 Tage, Wiener Zeit). Die Summe rechnet live mit.
   - **Freie Position** (Hauptfall): Titel, Beschreibung, Foto (hochladen, aus Medien oder Foto eines Produkts), Menge, Endpreis, optional internes Floristen-Budget.
   - **Shop-Produkt** + Größe mit änderbarem Preis (optional).
   - **Lieferung** ist frei: jedes Datum (Sperr-/Nicht-Liefertage nur als Hinweis), Zeitfenster und/oder Zeit als Text, Adresse oder Treffpunkt, jede PLZ. Die Gebühr wird aus dem Liefergebiet der PLZ vorgeschlagen (sonst 0) und ist immer änderbar. „Mit Lieferung“ abhaken = Abholung/nach Absprache – die Bestellung zeigt dann „Nach Absprache“.
   - Grußkarte nur, solange Grußkarten in den Einstellungen aktiv sind (sonst „kommt bald“).
   - Optional: Hinweis an die Floristik (wird beim Zuordnen eines Partners vorausgefüllt und erscheint dann fett im Auftrag), Rechnungsadresse mit UID, interne Notiz.
2. **Senden**: „Speichern & senden“ schickt die Mail in der Sprache des Angebots (Foto, Positionen, Summe, großer „Jetzt bezahlen“-Button, gültig bis). „Link kopieren“ für WhatsApp & Co. (ein Entwurf gilt dann als gesendet). „Test-Mail“ an eine beliebige Adresse – bei einem Entwurf öffnet der Link darin eine **Vorschau** der Seite (wie der Kunde sie sieht, Hinweis „Vorschau – noch nicht versendet“); bezahlen geht erst nach dem Senden oder „Link kopieren“ (auch der Server lehnt Zahlungen für Entwürfe ab). Im Admin gibt es dafür auch „Vorschau ansehen“. Nach Änderungen erneut senden.
3. **Kund:in** öffnet `/angebot/<token>` (bzw. `/en/angebot/<token>` …): Übersicht, Gesamtpreis mit derselben USt-Formulierung wie im Warenkorb, Zahlungsart wie im Checkout – bei Stripe-Zahlarten erscheint das Stripe-Zahlungsfeld direkt unter der gewählten Zahlart –, AGB/Widerruf bestätigen, „Jetzt bezahlen“. **Ein Schritt:** kein zweiter Bildschirm mehr; Ablauf wie in der Kasse (`elements.submit()` im Klick → `/api/offers/pay` → Betragsprüfung → `confirmPayment`, siehe docs/PAYMENTS.md). Das erste Öffnen im Browser setzt „Angesehen“ (Link-Vorschauen und das Team zählen nicht).
4. **Zahlung**: Der Server legt aus dem gespeicherten Angebot eine normale Bestellung an (`createOrderFromOffer` in `src/lib/orders.ts`) – Beträge nur vom Server – und startet Mock/Stripe/PayPal wie im Checkout. Die Antwort enthält den Server-Betrag (`total`); weicht er vom angezeigten ab (Angebot inzwischen geändert), wird nicht bestätigt, sondern der neue Betrag gezeigt. Danach: Angebot „Bezahlt“ mit Link zur Bestellung, die üblichen Mails (Bestätigung in der Sprache der Kund:in, Bestelleingang ans Team).

Status: Entwurf · Gesendet · Angesehen · Bezahlt · Abgelaufen · Storniert.

## Bestellungen aus Angeboten

- Erscheinen unter *Bestellungen* wie jede andere Bestellung, mit Verweis auf das Angebot, Rechnungsadresse und Hinweis an die Floristik.
- **Es wird nie automatisch ein Partner beauftragt oder ein Kurier gebucht** – Ware und Zustellung organisiert das Team selbst (bei Bedarf Partner/Kurier von Hand im Admin).
- Freie Positionen sind `custom`-Zeilen ohne Lager; sie zeigen ihre Beschreibung in Mails, Partner-Auftrag, Bestellseite und Admin.
- Kundentexte nennen nicht, wer die Blumen liefert oder bindet.

## Sicherheit

- Admin-Aktionen nur mit Admin-Sitzung (`requireAdmin`).
- Token: 32 Zeichen base64url (192 Bit), Format wird vor jedem Lookup geprüft, Vergleich über SHA-256 mit `timingSafeEqual`. Entwürfe und unbekannte Links → 404. Seite `noindex`, nicht in der Sitemap.
- `POST /api/offers/pay` und `POST /api/offers/view` sind rate-limitiert. Doppelte Zahlung ist ausgeschlossen: pro Angebot serialisiert, eine offene Zahlung wird wiederverwendet (Stripe: derselbe PaymentIntent); bevor eine neue Bestellung eine offene ersetzt (anderer Anbieter, Angebot geändert, Storno), wird die alte Zahlung geprüft und abgebrochen.

## Daten

`data/offers.json` bzw. Postgres-Dokument `data/offers` (über `src/lib/cms.ts`). Code: `src/lib/offers-core.ts` (Regeln, getestet), `src/lib/offers.ts` (Speicher, Token, Status), `src/app/admin/angebote/*`, `src/app/[locale]/(shop)/angebot/[token]`, `src/app/api/offers/*`. Texte: Namespace `offer` und `mail.offer` in allen Sprachen. Keine neuen Umgebungsvariablen.
