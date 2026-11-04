# Kurier (RiderX)

Nach einer bestätigten Zahlung bucht der Shop automatisch einen RiderX-Fahrer, der den Strauß beim Partnerfloristen abholt und zustellt. Ohne RiderX-Zugang (`RIDERX_*` leer) passiert nichts – Bestellungen werden wie bisher von Hand organisiert.

Code: `src/lib/courier/riderx-core.ts` (reine Logik, getestet in `tests/unit/riderx.test.ts`) und `src/lib/courier/index.ts` (HTTP, Bestellung, Webhook). Webhook-Route: `src/app/api/webhooks/riderx/route.ts`.

## Ablauf

1. **Zahlung bestätigt** (`markOrderPaid` – Stripe/PayPal-Rückkehr oder Webhook) → `bookCourier`. Mehrfache Aufrufe buchen nicht doppelt.
2. **Abholzeit** = Beginn des gebuchten Lieferfensters (z. B. 9:00 bei „9–12 Uhr“), aber frühestens `RIDERX_PREP_MINUTES` (Standard 60) nach jetzt, damit der Florist binden kann. RiderX liefert direkt und laut Vereinbarung garantiert im Fenster, wenn zum Fensterbeginn abgeholt wird.
3. **Grenzen:** Abholung nur 07:00–21:15 (später fällt bei RiderX ein Nachtzuschlag an). Ist das Fenster schon vorbei oder die Abholung später als 21:15, wird **nicht** gebucht – die Bestellung bekommt einen Hinweis im Verlauf und kann im Admin von Hand gebucht werden.
4. **Koordinaten:** RiderX verlangt Breiten-/Längengrad. Wiener Adressen werden über den offiziellen Adressdienst der Stadt Wien (data.wien.gv.at, OGD) aufgelöst – nur ein Treffer mit derselben PLZ zählt –, alles andere bzw. ein Fehlschlag über OpenStreetMap Nominatim. Die Abholadresse kann mit `RIDERX_PICKUP_LAT/LNG` fest hinterlegt werden.
5. **Status:** RiderX meldet Änderungen per Webhook. `pickup` → „Unterwegs“, `completed` → „Zugestellt“, `address_not_found`/`shipment_destroyed` → „Nicht zustellbar“ (nur vorwärts, stornierte Bestellungen bleiben unberührt). Kund:innen bekommen dabei die normale Status-Mail.

## Admin

In der Bestellung (`/admin/bestellungen/[id]`) gibt es die Karte **Kurier (RiderX)**: Status, RiderX-Nummer, Abholzeit, Fehler sowie **Fahrer buchen** (auch erneut nach Fehler/Storno) und **Fahrer stornieren**. Wird eine Bestellung auf „Storniert“ gesetzt, wird der Fahrer automatisch mit storniert.

Storno bei RiderX: geplante Abholungen kostenlos bis 30 Min. vorher, „sofort“-Buchungen innerhalb von 5 Min.

## Webhook

In der RiderX Developer Console (Profil → Developer Console → Add Webhook) als URL `https://<domain>/api/webhooks/riderx` eintragen. Die Route ist auch bei aktivem `SITE_PASSWORD` erreichbar. Signatur: `X-Service-Signature` = HMAC-SHA256(Partner-Secret, roher Body); weil RiderX die Kodierung noch nicht festgelegt hat, werden Hex und Base64 akzeptiert. Andere Events (z. B. `chat.message_created`) werden mit 200 bestätigt und ignoriert.

## Umgebungsvariablen

| Variable | Pflicht | Bedeutung |
| --- | --- | --- |
| `RIDERX_CLIENT_ID`, `RIDERX_CLIENT_SECRET` | ja | API-Zugang aus der Developer Console (Test- und Live-Server haben eigene Zugänge) |
| `RIDERX_API_URL` | – | `https://t3.riderx.me` (Test, Standard) oder `https://gearbox.riderx.me` (Live) |
| `RIDERX_PICKUP_STREET`, `RIDERX_PICKUP_HOUSE_NUMBER`, `RIDERX_PICKUP_ZIP` | ja | Abholadresse beim Partnerfloristen |
| `RIDERX_PICKUP_CITY`, `RIDERX_PICKUP_NAME`, `RIDERX_PICKUP_PHONE`, `RIDERX_PICKUP_EXTRA` | – | Ort (Standard Wien), Name/Telefon für den Fahrer, Zusatz (z. B. „Hintereingang“) |
| `RIDERX_PICKUP_LAT`, `RIDERX_PICKUP_LNG` | – | feste Koordinaten der Abholadresse statt Adresssuche |
| `RIDERX_WEBHOOK_SECRET` | für Webhooks | Partner-Secret für die Signaturprüfung |
| `RIDERX_PACKAGE_ID` | – | Pakettyp, Standard `2` (Auto, 90×60×60 cm, 25 kg) |
| `RIDERX_ABSENT_INSTRUCTIONS` | – | Empfänger nicht da: `drop_by_neighbour` (Standard), `drop_by_door` oder `destroy` |
| `RIDERX_PREP_MINUTES` | – | Vorlaufzeit für den Floristen, Standard 60 |
| `RIDERX_DEFAULT_PICKUP` | – | Abholzeit für Bestellungen ohne Zeitfenster, Standard `09:00` |
| `RIDERX_AUTO_BOOK` | – | `false` = nicht automatisch buchen, nur per Button im Admin |

## Getestet

Am Testserver (`t3.riderx.me`, keine echten Fahrer): Anlegen mit Abholzeit, Telefon- und Adressformat, Doppelbuchungs-Schutz und Storno. Abweichend von der API-Doku erwartet RiderX die Adressen in `sender_address_details`/`receiver_address_details` und Koordinaten sind Pflicht.
