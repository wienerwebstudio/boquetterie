# Outreach – persönliche E-Mails an Betriebe

Admin → **Outreach** (Gruppe „Verkauf“). Für Partneranfragen an Wiener Floristiken und Angebote an Bestatter, Hotels, Büros, Restaurants/Cafés. Jede Mail geht **einzeln an genau einen Kontakt** – nie eine Sammelmail mit mehreren Empfängern.

## Bereiche

| Seite | Inhalt |
| --- | --- |
| `/admin/outreach` | Kontakte mit Zählern je Status, Filter (Status, Kategorie, Bezirk/PLZ, Suche), Auswahl → „Ausgewählte anschreiben“, CSV-Export, Warteschlange |
| `/admin/outreach/kontakte/<id>` | Daten, Status, Notizen mit Zeitstempel, gesendete Mails mit Öffnungen/Klicks, kompletter Verlauf, „Als abgemeldet markieren“, Löschen (`neu` = anlegen) |
| `/admin/outreach/import` | CSV/TSV-Datei oder aus Excel einfügen, Vorschau, doppelte Adressen überspringen oder aktualisieren |
| `/admin/outreach/vorlagen` | Vorlagen anlegen, bearbeiten, duplizieren, löschen; Editor mit Live-Vorschau und Test-Mail |
| `/admin/outreach/senden` | Vorlage + Kontakte wählen, jetzt senden oder planen, Nachfassen |
| `/admin/outreach/versand` | Warteschlange (abbrechen), Protokoll, „Warteschlange jetzt abarbeiten“ |
| `/admin/outreach/export` | CSV (UTF-8 mit BOM, Semikolon) mit Status, Abmeldung, letzter Mail, geöffnet/geklickt |

Statusablauf: **Neu → Angeschrieben → Geantwortet → Termin → Partner/Kunde → Kein Interesse**. Nach dem ersten Versand springt „Neu“ automatisch auf „Angeschrieben“; alles andere setzt ihr von Hand.

## Vorlagen

- Felder: Name (intern), Kategorie, Sprache (de/en), Betreff, optionale Überschrift, Text.
- Textsyntax: Leerzeile = Absatz, `**fett**`, `[Linktext](https://…)`, Zeilen mit `- ` = Aufzählung. Alles andere wird escaped (kein HTML).
- Platzhalter: `{Anrede}` `{Vorname}` `{Nachname}` `{Firma}` `{Bezirk}` (Chips im Editor fügen am Cursor ein). `{Anrede}`: „Sehr geehrte Frau Huber,“ / „Sehr geehrter Herr Huber,“ / „Guten Tag,“ (ohne Nachname oder Anrede); Englisch „Dear Ms Huber,“ / „Dear Mr Huber,“ / „Hello,“.
- Grußformel („Herzliche Grüße / Ihr Blumora-Team“), Signatur (E-Mail, Telefon, Adresse aus den Einstellungen – Platzhalter mit „[“ werden weggelassen), Abmeldelink und Fußzeile kommen automatisch dazu.
- **Kopfbild** (optional, wird auf 1200 × 600 zugeschnitten), **Anhänge** (PDF bis 10 MB, Bilder; zusammen ≤ 20 MB, max. 8) werden als echte Mail-Anhänge verschickt und unten in der Mail als „Chips“ genannt.
- **Video**: wird nie angehängt. Video hochladen (MP4/MOV/WebM, ≤ 50 MB) oder Link einfügen (YouTube, Vimeo …) und ein Vorschaubild hochladen – der Play-Knopf wird beim Upload ins Bild eingesetzt (funktioniert in jedem Mailprogramm).
- Startvorlagen werden beim ersten Aufruf angelegt (Partneranfrage Florist, B2B Bestattungshaus, Hotel, Büro & Firmen, Restaurant & Café, Nachfass-Mail, Hotel und Büro auf Englisch). Sie enthalten nur belegte Fakten (23 Bezirke, Mo–So, Stundenfenster 9–22 Uhr, Same-Day bis 18:30/So 17:45, Partner-Floristik, Kurier). Konditionen, Preise, Abrechnung: immer als Gesprächsangebot – bitte vor dem ersten Versand lesen und anpassen.
- Geplante Mails werden beim Versand mit der dann aktuellen Vorlage erzeugt – Änderungen an einer Vorlage gelten also auch für schon geplante Mails.

## Senden

- **Test-Mail** im Vorlagen-Editor: die aktuelle (auch ungespeicherte) Fassung mit „[TEST]“ im Betreff an eine eingegebene Adresse (Vorgabe `MAIL_ADMIN`, sonst office@blumora.at), mit Beispielkontakt oder dem Kontakt aus der Vorschau. Ohne Tracking.
- **Jetzt** oder **geplant** (Datum/Uhrzeit Wiener Zeit).
- **30-Tage-Warnung**: Kontakte, die in den letzten 30 Tagen eine Outreach-Mail bekommen haben, werden angezeigt und ohne Haken „Trotzdem senden“ ausgelassen. Ein Kontakt steht mit derselben Vorlage nie doppelt in der Warteschlange.
- **Tageslimit** `OUTREACH_DAILY_LIMIT` (Standard 50, gezählt nach Wiener Datum, inkl. Nachfassen). Der Rest bleibt in der Warteschlange und geht am nächsten Tag raus. Pro Durchlauf höchstens 25 Mails bzw. 20 Sekunden (Serverless-Zeitlimit), bei Resend mit kurzer Pause (Rate-Limit).
- **Nachfassen** (optional): „nach N Tagen (Standard 7) mit Vorlage X“. Wird nach dem Versand der ersten Mail einmal eingeplant und nur gesendet, wenn der Kontakt dann noch „Angeschrieben“ und nicht abgemeldet ist – sonst „übersprungen“.
- Absender ist das normale `MAIL_FROM`, Antwort an die E-Mail aus den Einstellungen (office@blumora.at). `MAIL_REDIRECT_TO` gilt wie bei allen Mails (Test-Mails ausgenommen).

## Warteschlange

`/api/cron/outreach` (Bearer `CRON_SECRET`) arbeitet fällige Mails ab: geplante, den Rest über dem Tageslimit und das Nachfassen. Auf Netlify ruft `netlify/functions/cron-outreach.mts` den Endpunkt **alle 10 Minuten** auf (wie die Partner-Erinnerungen). Zusätzlich gibt es den Button „Warteschlange jetzt abarbeiten“. Mails werden vor dem Versand „beansprucht“ (`sending`), damit Cron und Button nicht doppelt senden; hängt ein Durchlauf länger als 15 Minuten, wird die Mail als fehlgeschlagen markiert und **nicht** erneut gesendet.

## Tracking (ungefähr)

- Öffnungen: 1×1-Pixel `/api/o/o/<token>` (Token pro Mail, zufällig). Ungefähr: manche Postfächer laden keine Bilder, andere laden sie automatisch vor. Wiederholte Aufrufe innerhalb von 10 Minuten zählen einmal.
- Klicks: Links in der Mail führen über `/api/o/c/<token>?i=<n>`. Weitergeleitet wird **nur** auf die n-te URL, die mit genau dieser Mail gespeichert wurde (kein offener Redirect); alles andere landet auf der Startseite.
- Öffnungen und Klicks stehen im Verlauf des Kontakts, in der Liste („geöffnet“, „geklickt“) und im Protokoll.

## Abmeldung

- Jede Mail hat unten „Keine weiteren E-Mails erhalten“ → `/e-mail-abmelden?t=<token>` (Deutsch + Englisch, `noindex`). Erst der Klick auf den Button meldet ab (Link-Scanner ändern nichts).
- Header `List-Unsubscribe` (HTTPS + mailto) und `List-Unsubscribe-Post: List-Unsubscribe=One-Click` → `POST /api/outreach/unsubscribe` (RFC 8058, Gmail/Yahoo).
- Token = HMAC-SHA256 über die Adresse, Schlüssel aus `ADMIN_SECRET` (sonst `AUTH_SECRET`, mind. 16 Zeichen). **Ohne Secret wird nichts gesendet.** Ein Wechsel des Secrets macht alte Abmeldelinks ungültig (die Seite bittet dann, auf die Mail zu antworten).
- Abgemeldete Adressen (`outreach-unsubscribed`) bekommen nie wieder eine Outreach-Mail: geplante Mails werden abgebrochen, Import und Senden überspringen sie, in Listen sind sie ausgegraut. Im Admin lässt sich eine Adresse auch von Hand abmelden oder (nur auf ausdrücklichen Wunsch) wieder freigeben.
- Tracking, Abmeldeseite und -API bleiben auch bei aktivem `SITE_PASSWORD` erreichbar.

## Daten

Alles über `src/lib/cms.ts`, Laufzeitdokumente (`kind = data`, JSON-Store oder Postgres):

| Dokument | Inhalt |
| --- | --- |
| `outreach-contacts` | Kontakte inkl. Notizen und Verlauf |
| `outreach-templates` | Vorlagen (Startvorlagen beim ersten Lesen) |
| `outreach-sends` | Warteschlange + Protokoll (Token, erlaubte Klick-URLs, Öffnungen, Klicks) |
| `outreach-unsubscribed` | Abmeldeliste |

Read-modify-write wie bei Bestellungen („last write wins“). Dateien liegen unter `outreach/JJJJ/MM/…` im Upload-Speicher (lokal, Netlify Blobs oder S3) und werden über `/media/outreach/…` ausgeliefert.

Code: `src/lib/outreach/*` (format, render, import, queue, tokens, validate, service), `src/app/admin/outreach/*`, `src/components/admin/outreach/*`, Tests `tests/unit/outreach-*.test.ts`.

## Umgebungsvariablen

| Variable | Bedeutung |
| --- | --- |
| `OUTREACH_DAILY_LIMIT` | Mails pro Tag, Standard `50` |
| `ADMIN_SECRET` / `AUTH_SECRET` | Schlüssel für Abmeldelinks (Pflicht für den Versand) |
| `CRON_SECRET` | Für die Warteschlange alle 10 Minuten (Netlify, Scope Functions) |
| `MAIL_FROM`, `RESEND_API_KEY` bzw. `SMTP_*` | Versand wie alle Mails (docs/MAIL.md) |

## Grenzen

- Uploads laufen über eine Netlify-Funktion; Anfragen über ca. 6 MB können dort scheitern. Große PDFs/Videos daher verkleinern oder das Video als Link (YouTube, Vimeo) einfügen.
- Hochgeladene Videos werden als Ganzes ausgeliefert (kein Streaming) – für längere Videos ist ein Link besser.
