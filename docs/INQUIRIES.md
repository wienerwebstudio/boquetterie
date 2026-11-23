# Anfragen (Sonderwünsche & Lieferfragen)

Kund:innen schicken über die Seite **„Anfrage“** Fragen wie „Könnt ihr um 7:00 früh liefern?“, „Könnt ihr an einen Stand am Christkindlmarkt liefern?“ oder „Ich möchte genau diesen Strauß – geht das bis Samstag?“. Das Team beantwortet sie im Admin unter **Anfragen** und macht bei Bedarf mit einem Klick ein [individuelles Angebot](OFFERS.md) daraus.

## Seite im Shop

- URL: `/anfrage` (de), `/en/enquiry`, `/tr/talep`, `/bks/upit`, `/uk/zapyt`, `/ru/zapros`, `/pl/zapytanie`, `/ro/cerere`, `/hu/egyedi-keres`, `/bg/zapitvane`, `/sk/dopyt`, `/it/richiesta`, `/fr/demande`, `/es/solicitud`; ar/fa/ce wie Englisch (`/ar/enquiry` …). Segment `anfrage` in `src/i18n/paths.ts`, `routes.customRequest`.
- In der Sitemap mit hreflang (wie Kontakt/Lieferung), eigener Titel/Description je Sprache (`inquiry.metaTitle/metaDescription`).
- Einstieg: im **mobilen Menü** hervorgehobener Eintrag „Anfrage stellen“ (Untertitel „Uhrzeit, Ort, Wunschstrauß“, Icon PenLine) direkt unter den Shop-Kategorien; am Desktop im Blumen-Menü unter „Schnell zu“ (kein eigener Punkt in der Hauptnavigation – zu wenig Platz bei langen Sprachen). Links von Produkt-, Kontakt-, FAQ-Seite und Footer folgen separat; `?produkt=<slug>` wählt den Strauß vor.
- Texte versprechen **eine Antwort** („wir melden uns in Kürze“) – nie eine Antwortzeit, nie ein Angebot.

### Formular

| Feld | Pflicht | Hinweis |
| --- | --- | --- |
| Worum geht es? | nein | Mehrfachauswahl: Bestimmte Uhrzeit · Besonderer Lieferort (Event, Markt, Hotel, Büro) · Bestimmter Strauß aus dem Shop · Größere Bestellung / Firma · Eigener Wunschstrauß · Sonstiges (`time`, `place`, `product`, `large`, `custom`, `other`) |
| Strauß aus dem Shop | nein | Alle aktiven Produkte (Namen in der Sprache der Seite) + „Noch offen“; vorgewählt über `?produkt=` |
| Wunschtermin | nein | Datum ab heute (Wiener Zeit) |
| Uhrzeit | nein | Freitext, z. B. „7:00“ oder „14–16 Uhr“ |
| Termin ist flexibel | nein | Häkchen |
| Lieferort | nein | Freitext: Adresse, PLZ oder Ort („Christkindlmarkt Rathausplatz, Stand 12“) |
| Budget | nein | Nur sichtbar (und gespeichert) bei „Größere Bestellung“ oder „Eigener Wunschstrauß“: bis 50 € · 50–100 € · 100–200 € · über 200 € · offen |
| Deine Frage / Nachricht | ja | 10–2000 Zeichen |
| Foto zur Inspiration | nein | Ein Bild, siehe unten |
| Name, E-Mail | ja | |
| Telefon / WhatsApp | nein | |
| Einwilligung Datenschutz | ja | Link auf die Datenschutzerklärung; Zeitpunkt wird gespeichert (`consentAt`) |
| Honeypot `website` | – | gefüllt → Antwort `ok`, nichts wird gespeichert |

Validierung im Browser und auf dem Server mit derselben Funktion (`validateCustomRequest` in `src/lib/custom-requests-core.ts`). Fehler kommen als Schlüssel von `inquiry.errors` zurück und werden im Formular übersetzt.

### Foto

Gleiche Pipeline wie Kundenfotos in Bewertungen (`src/lib/uploads.ts` → `processRequestPhoto` / `storeRequestPhoto`): Der Browser verkleinert auf max. 2000 px (JPEG), der Server nimmt max. **15 MB** an, erkennt das Format an den Bytes (JPEG, PNG, WebP; HEIC → eigener Hinweis), dreht nach EXIF, entfernt alle Metadaten (inkl. GPS), max. 2000 px, JPEG q82.

- Schlüssel `anfragen/<jahr>/<monat>/<af-nummer>-<zufall>-<hash>.jpg`.
- **Privat:** `/media/anfragen/…` liefert nur an angemeldete Admins (sonst 404, `no-store`). Im Admin daher `<img>` statt `next/image`. Mit S3 liegt das Foto unter einem nicht erratbaren Namen im Bucket (wie alle S3-Objekte öffentlich lesbar, nicht verlinkt).
- Das Team bekommt das Foto zusätzlich als Anhang der Benachrichtigung.
- Fotos werden nicht automatisch gelöscht (`deleteRequestPhoto` steht bereit).

## Ablauf beim Absenden (`POST /api/custom-request`)

1. Rate-Limit (6 / 10 min pro IP), Größe des Bodys, Felder, erst dann das Foto dekodieren.
2. Unbekannte Produkte werden verworfen (kein Fehler); gespeichert wird `{ slug, name }` (deutscher Name).
3. Speichern im Laufzeitdokument **`custom-requests`** (`data/custom-requests.json` bzw. Postgres, über `src/lib/cms.ts`): `id` `AF-XXXXXX`, `createdAt`, `locale`, `status: "new"`, alle Felder, Foto-URL/Schlüssel, `history`.
4. Mails (`sendCustomRequestMails` in `src/lib/mail.ts`):
   - **Kund:in**, in der Sprache der Seite: „Danke für deine Anfrage – wir melden uns in Kürze“ + Zusammenfassung (Texte `mail.customRequest`).
   - **Team** (`MAIL_ADMIN`, Deutsch): Themen hervorgehoben, alle Felder, Nachricht, Foto als Anhang + Link, Button „Anfrage im Admin öffnen“; Reply-To = Kund:in.
5. Gespeichert **oder** Team-Mail verschickt reicht (wie beim Kontaktformular). Klappt beides nicht → 503 `unavailable` mit Mail-Link-Fallback im Formular.
6. Antwort `{ ok: true, id }` → Erfolgsmeldung mit Nummer auf der Seite.

## Admin → Anfragen (`/admin/anfragen`)

- Gruppe „Verkauf“, über „Angebote“. Ein Zähler in der Navigation zeigt neue Einträge.
- Liste aus **zwei Quellen**: Anfragen (`custom-requests`, Badge „Anfrage“) und Nachrichten des Kontaktformulars (`contact-messages`, Badge „Kontakt“). Filter nach Status (Neu, Beantwortet, Angebot erstellt, Erledigt) und Art, Suche über Nummer, Name, E-Mail, Text. Kontaktnachrichten ohne eigenen Status gelten als „Neu“ (ungelesen) bzw. „Beantwortet“ (`read: true`).
- Detail `/admin/anfragen/<id>`: Themen als Badges, Nachricht, Strauß, Termin, Ort, Budget, Foto, Kontaktdaten mit Buttons **E-Mail** (`mailto:`), **Anrufen** (`tel:`), **WhatsApp** (`wa.me`, österreichische Nummern ohne Vorwahl bekommen +43); Status + interne Notiz speichern; Verlauf.
- **„Angebot erstellen“** öffnet `/admin/angebote/neu?anfrage=AF-…` vorausgefüllt (`customRequestToOfferForm`):
  - Kund:in: Name aufgeteilt (letztes Wort = Nachname), E-Mail, Telefon, Sprache.
  - Lieferung: Datum; Uhrzeit „14–16 Uhr“ → Von/Bis, sonst als „Zeit als Text“.
  - Ort: „Straße Nr, PLZ Ort“ → Adresse; alles andere → Treffpunkt (Beschreibung = Text, PLZ übernommen, falls vorhanden). Empfänger:in = Kund:in.
  - Positionen: gewähltes Shop-Produkt (erste Größe, Preis aus dem Shop) – sonst eine freie Position mit der Nachricht als Beschreibung.
  - Interne Notiz: „Aus Anfrage AF-…“, Themen, Budget, „Termin flexibel“, Originaltexte von Uhrzeit/Ort (und die Nachricht, wenn ein Produkt gewählt war).
  - Nach dem Speichern: Angebot bekommt `requestId`, die Anfrage `offerId` und Status „Angebot erstellt“; beide verlinken einander.

## Datenschutz

Gespeichert werden Name, E-Mail, optional Telefon, die Angaben zur Anfrage, optional ein Foto (ohne Metadaten) und der Zeitpunkt der Einwilligung. Zweck: Beantwortung der Anfrage / Angebot. **Die Datenschutzerklärung sollte die Anfrage-Daten (inkl. Foto, WhatsApp-Kontakt auf Wunsch) erwähnen** – Rechtstexte werden hier bewusst nicht geändert, das erledigen die Inhaber. Es gibt (noch) keine automatische Löschfrist.

## Code & Texte

`src/lib/custom-requests-core.ts` (Regeln, rein, getestet), `src/lib/custom-requests.ts` (Speicher, Posteingang), `src/app/api/custom-request/route.ts`, `src/app/[locale]/(shop)/anfrage/*`, `src/app/admin/anfragen/*`, Mail-Vorlagen `customRequestConfirmation` / `adminCustomRequest` in `src/lib/mail/templates.ts`. Texte: Namespace `inquiry`, `mail.customRequest`, `layout.header.customRequest(Hint)` in allen 17 Sprachen; Admin nur Deutsch. Keine neuen Umgebungsvariablen. Tests: `tests/unit/custom-requests.test.ts`, `tests/e2e/custom-request.spec.ts`.
