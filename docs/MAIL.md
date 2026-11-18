# Blumora – E-Mail, Erinnerungen & Cron

Transaktionale E-Mails (Bestellbestätigung, Statusupdates, Bewertungsanfrage, Anlass-Erinnerungen, Magic-Link) laufen über `src/lib/mail.ts`. Die Vorlagen liegen in `src/lib/mail/templates.ts` (reine Funktionen, liefern `{ subject, html, text }`).

## Umgebungsvariablen

| Variable | Pflicht | Beschreibung |
| --- | --- | --- |
| `RESEND_API_KEY` | für echten Versand | API-Key von [Resend](https://resend.com). Ohne Key werden alle Mails nur ins Server-Log geschrieben (`[mail] (console provider) …`) – praktisch für Entwicklung und Previews. |
| `SMTP_HOST` | Alternative zu Resend | SMTP-Server des eigenen Postfachs (z. B. internex). Wird genutzt, wenn **kein** `RESEND_API_KEY` gesetzt ist. |
| `SMTP_PORT` | nein | Standard `587` (STARTTLS). Bei `465` wird automatisch direkt verschlüsselt. |
| `SMTP_SECURE` | nein | `true`/`false` erzwingt die direkte TLS-Verbindung; ohne Wert entscheidet der Port. |
| `SMTP_USER`, `SMTP_PASS` | bei SMTP | Anmeldung am Postfach (meist die volle Adresse und das Postfach-Passwort). **`SMTP_PASS` bei Netlify als Secret.** |
| `MAIL_FROM` | ja (bei Resend) | Absender, z. B. `Blumora <hallo@blumora.at>`. Die Domain muss bei Resend verifiziert sein (siehe unten). Fallback: `Blumora <no-reply@example.com>`. |
| `MAIL_REPLY_TO` | nein | Reply-To-Adresse, z. B. das Team-Postfach. Antworten von Kund:innen landen dort. |
| `MAIL_ADMIN` | nein | Interne Adresse, die bei jeder neuen Bestellung eine kompakte Zusammenfassung mit Link in den Admin bekommt. Leer = keine internen Mails. |
| `MAIL_REDIRECT_TO` | nein | **Test-Schalter:** Ist eine Adresse gesetzt, gehen *alle* Mails (Kund:innen, intern, Floristik) nur an diese Adresse; der Betreff nennt die eigentlichen Empfänger (`[TEST an …]`). Für den Livebetrieb löschen. |
| `MAIL_FLORIST` | nein | **Ersatzadresse(n)** für einen Partner (Admin → *Partner*), bei dem keine eigene E-Mail eingetragen und „Ersatzweise Adresse aus MAIL_FLORIST“ angehakt ist (anfangs Blumen Dody). Es geht **nichts mehr automatisch** an diese Adresse: Ein Auftrag geht erst raus, wenn die Bestellung im Admin einem Partner zugeordnet wird. |
| `CRON_SECRET` | für Cron | Geheimnis, das die Cron-Endpunkte unter `/api/cron/*` schützt. Anfragen müssen `Authorization: Bearer <CRON_SECRET>` senden. Erzeugen z. B. mit `openssl rand -hex 32`. Ohne Wert antworten die Endpunkte mit 503, und die Netlify-Zeitpläne (siehe unten) rufen nichts auf – dann gehen **weder Bewertungsanfragen noch Anlass-Erinnerungen automatisch** raus. **Auf Netlify muss der Wert von den Inhabern selbst angelegt werden** (Scope „Functions“, siehe Abschnitt Netlify). |

Die öffentliche URL (für Links in Mails) kommt **nicht** aus einer Env-Variable, sondern aus `content/settings.json` → `seo.siteUrl` (im Admin unter Einstellungen → SEO). Markenname, Claim und Kontakt-Mail stammen ebenfalls aus den Einstellungen; Platzhalter-Werte (`[…]`) werden nie in Mails ausgegeben.

Bei SMTP muss `MAIL_FROM` die Adresse des Postfachs sein (z. B. `Blumora <office@blumora.at>`), sonst lehnen viele Server den Versand ab. Die Mails werden nach der Antwort an den Kunden verschickt (`after()`), zusammen mit der Kurierbuchung – eine langsame Mail verzögert die Zahlung nie und wird auf Netlify nicht abgeschnitten.

Beispiel `.env.local`:

```
RESEND_API_KEY=re_xxxxxxxxx
MAIL_FROM="Blumora <hallo@blumora.at>"
MAIL_REPLY_TO=hallo@blumora.at
MAIL_ADMIN=bestellungen@blumora.at
CRON_SECRET=<openssl rand -hex 32>
```

## Domain bei Resend verifizieren (SPF / DKIM)

Damit Mails von `@blumora.at` nicht im Spam landen, muss die Domain bei Resend verifiziert werden:

1. Resend → **Domains** → **Add Domain** → `blumora.at` (Region EU wählen, wenn verfügbar).
2. Resend zeigt DNS-Einträge an, die beim Domain-Registrar (z. B. World4You, nic.at-Provider) angelegt werden:
   - **DKIM**: ein `TXT`-Eintrag unter `resend._domainkey.blumora.at` (Wert = öffentlicher Schlüssel von Resend). Signiert jede Mail kryptografisch.
   - **SPF**: ein `TXT`-Eintrag (bei Resend meist auf einer Subdomain wie `send.blumora.at`) mit `v=spf1 include:amazonses.com ~all` sowie ein passender `MX`-Eintrag für Bounces. Besteht bereits ein SPF-Eintrag auf der Root-Domain, wird der `include:` dort ergänzt – es darf nur **einen** SPF-Eintrag pro Name geben.
   - Optional **DMARC**: `TXT` unter `_dmarc.blumora.at`, z. B. `v=DMARC1; p=none; rua=mailto:postmaster@blumora.at` (erst beobachten, später auf `quarantine` verschärfen).
3. Nach dem Eintragen in Resend auf **Verify** klicken. DNS-Änderungen brauchen bis zu 24–48 h, meist geht es in Minuten.
4. Erst dann `MAIL_FROM` auf die echte Domain setzen. Vorher liefert Resend nur an die eigene Account-Adresse (Sandbox).

## Cron-Endpunkte

Beide Endpunkte akzeptieren `GET` und `POST`, brauchen `Authorization: Bearer $CRON_SECRET` und liefern JSON mit einer kleinen Statistik zurück. Sie sind idempotent – mehrfaches Aufrufen am selben Tag schickt nichts doppelt.

| Endpunkt | Was passiert | Empfohlen |
| --- | --- | --- |
| `/api/cron/reminders` | Verschickt bestätigte Anlass-Erinnerungen, deren Sendefenster (Anlass − Vorlauftage) heute (Europe/Vienna) erreicht ist. Jährliche Erinnerungen bekommen `lastSentYear`, einmalige werden nach dem Versand gelöscht. Unbestätigte Einträge älter als 30 Tage werden entfernt. | 1× täglich am Vormittag |
| `/api/cron/review-requests` | Verschickt „Wie war der Strauß?“ einmalig für Bestellungen mit Status *Zugestellt*, **ab 1 Tag** und bis 30 Tage nach der Zustellung (Zeitpunkt = letzter Wechsel auf *Zugestellt* im Bestellverlauf). Bestellungen mit Eintrag in `data/review-requests.json` (automatisch oder von Hand gesendet, oder schon bewertet) werden übersprungen. | 1× täglich |

### Netlify (Scheduled Functions) – Live-Betrieb

Auf Netlify gibt es keinen Server-Cron. Deshalb liegen im Repo zwei [Scheduled Functions](https://docs.netlify.com/build/functions/scheduled-functions/), die Netlify beim Deploy automatisch erkennt (Ordner `netlify/functions/`, keine `netlify.toml` nötig):

| Function | Zeitplan (UTC) | Ruft auf |
| --- | --- | --- |
| `netlify/functions/cron-reminders.mts` | `0 7 * * *` (09:00 Sommerzeit / 08:00 Winterzeit) | `POST /api/cron/reminders` |
| `netlify/functions/cron-review-requests.mts` | `30 7 * * *` (09:30 / 08:30) | `POST /api/cron/review-requests` |
| `netlify/functions/cron-partner-reminders.mts` | `*/10 * * * *` (alle 10 Min.) | `POST /api/cron/partner-reminders` |

Jede Function ruft den Endpunkt auf der veröffentlichten Adresse auf (`context.site.url`, also die Hauptdomain, z. B. `https://blumora.at`; Fallback `URL`, dann `NEXT_PUBLIC_SITE_URL`) und schickt `Authorization: Bearer $CRON_SECRET`. Die gemeinsame Logik steht in `netlify/lib/cron-trigger.ts`.

**Einmalig von den Inhabern einzurichten:**

1. Einen zufälligen Wert erzeugen, z. B. `openssl rand -hex 32` (oder ein Passwort-Manager, mind. 32 Zeichen).
2. Netlify → Projekt *boquetterie-preview* → **Project configuration → Environment variables → Add a variable**: Key `CRON_SECRET`, Wert einfügen, als **Secret** markieren, Scopes mindestens **Functions** (für die Endpunkte und die Scheduled Functions), Deploy-Kontext *Production*.
3. Neu deployen (Deploys → *Trigger deploy*). Umgebungsvariablen wirken erst ab dem nächsten Deploy.
4. Prüfen: Netlify → **Logs → Functions** → `cron-review-requests` → *Run now*. Im Log steht danach z. B. `[cron] /api/cron/review-requests: 200 {"ok":true,"window":"1-30d","due":0,"sent":0,"failed":0}`.

Fehlt `CRON_SECRET`, schreiben die Functions nur `[cron] …: CRON_SECRET ist nicht gesetzt – nichts aufgerufen …` ins Log und tun nichts. Scheduled Functions laufen nur auf dem veröffentlichten Produktions-Deploy (nicht in Deploy-Previews) und höchstens 30 Sekunden; die eigentliche Arbeit macht der aufgerufene Endpunkt.

### Vercel Cron

`vercel.json` im Projektroot (Vercel setzt den `Authorization: Bearer`-Header automatisch aus der Env-Variable `CRON_SECRET`):

```json
{
  "crons": [
    { "path": "/api/cron/reminders", "schedule": "0 7 * * *" },
    { "path": "/api/cron/review-requests", "schedule": "30 7 * * *" }
  ]
}
```

Zeiten sind UTC – `0 7` entspricht 9 Uhr MESZ bzw. 8 Uhr MEZ.

### Klassischer Server (crontab)

```
# m h dom mon dow   command
0  8 * * *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://blumora.at/api/cron/reminders
30 8 * * *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://blumora.at/api/cron/review-requests
```

`CRON_SECRET` dabei in der Crontab-Umgebung setzen oder direkt einsetzen. Zum manuellen Testen:

```
curl -i -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

## Welche Mails gibt es?

Alle Mails teilen sich ein schlichtes Layout: Elfenbein-Hintergrund (`#faf7f2`), weiße Karte, Waldgrün (`#1f3a2d`) für Buttons und Links, Serifen-Headline, Systemschriften, tabellenbasiert (Outlook-tauglich), keine externen Bilder. Jede Mail hat eine Plain-Text-Variante mit demselben Inhalt.

| Mail | Auslöser | Empfänger | Inhalt |
| --- | --- | --- | --- |
| **Bestellbestätigung** | Bestellung angelegt (`sendOrderConfirmation`) | Kund:in | Bestellnummer, Liefertermin + Zeitfenster, Empfängeradresse, Positionen mit Größe und Extras, Summen (Blumen, Extras, Lieferung, Gutschein, Gesamt), Grußkarten-Vorschau, Button zur Statusseite (`/bestellung/{id}?token=…`). |
| **Auftragszettel (Partner)** | **nur von Hand:** Bestellung → Karte „Partner“ → Partner wählen → „Zuordnen & Auftrag senden“ (auch „erneut senden“) | E-Mail(s) des gewählten Partners (Admin → Partner), ersatzweise `MAIL_FLORIST` | Was zu binden ist (mit Produktfoto), mit welchem Max. Budget (Listenpreis der Floristik, ohne Nachlass) und bis wann (Beginn des Lieferfensters = Abholung durch den Kurier). Keine Verkaufspreise, keine Kundendaten. Fehlt ein Budget, steht „nicht hinterlegt“. Zuordnung, Zeitpunkt und Empfänger stehen in der Bestellung (`order.partner`) und im Verlauf. Mit Button **„Auftrag bestätigen“** → `/partner-auftrag?order=…&token=…` (Token je Auftragsmail neu; die Seite bestätigt erst per Klick, nicht schon beim Öffnen). Danach steht „Bestätigt“ im Admin und `MAIL_ADMIN` bekommt „Bestätigt: … übernimmt BQ-…“. |
| **Erinnerung (Partner)** | Cron `partner-reminders` alle 10 Min.: Auftrag nicht bestätigt und **30 offene Minuten** (Öffnungszeiten des Partners, Admin → Partner) seit der Auftragsmail bzw. der letzten Erinnerung vergangen; höchstens 2 Erinnerungen, nur bis zum Liefertag | Partner (Auftrag noch einmal, Betreff „Erinnerung n: bitte bestätigen – …“) **und** `MAIL_ADMIN` („Erinnerung n: … hat BQ-… noch nicht bestätigt“, mit Telefonnummer; nach der 2.: „keine weiteren automatischen Erinnerungen – bitte jetzt anrufen“) | Endet sofort bei Bestätigung, Storno oder Partnerwechsel. Ein Auftrag um 0 Uhr bei Öffnung 07:30 → Erinnerung 1 um 08:00. |
| **Storno (Partner)** | automatisch beim Status *Storniert*, wenn der Partner den Auftrag schon bekommen hat; beim Wechsel zu einem anderen Partner; oder von Hand („Storno an … senden“) | der Partner, der den Auftrag bekommen hat | Betreff „STORNO Auftrag BQ-… – bitte nicht binden“, Grund (storniert / von anderer Floristik übernommen), Liefertermin und Positionen. Klappt der Versand nicht, steht im Admin und im Verlauf „bitte sofort telefonisch absagen“. Bestellungen, die vor der Umstellung (18.11.2026) bezahlt wurden, gelten als an Blumen Dody gesendet. |
| **Neue Bestellung (intern)** | gleichzeitig mit der Bestätigung | `MAIL_ADMIN` | Kompakte Zusammenfassung (Lieferung, Empfänger:in mit Telefon, Kund:in, **Partner – anfangs „noch keinem Partner zugeordnet“**, Positionen, und darunter **„Für den Partner“** wie im Auftragszettel: Fertig-Zeit, Max. Budget gesamt, je Position Foto, Größe und Max. Budget, Grußkarte, Zahlung, Gesamt) und Button zu `/admin/bestellungen/{id}`. Betreff enthält Nummer, Betrag und Liefertag. |
| **Statusupdate** | Statuswechsel im Admin auf einen Status mit `customerVisible: true` (`sendOrderStatusUpdate`) | Kund:in | Headline und Text pro Status (Zahlung bestätigt, In Vorbereitung, Strauß wird gebunden, Bereit, Unterwegs, Zugestellt). *Nicht zustellbar* und *Storniert* bekommen einen hervorgehobenen Hinweis, die Notiz zum Statuswechsel (bei „Nicht zustellbar“) und die Kontaktadresse. Immer mit Link zur Statusseite. Interne Notizen lösen nie eine Mail aus; ein „Wechsel“ auf denselben Status auch nicht. |
| **Bewertungsanfrage** | Cron `review-requests`, 1–30 Tage nach Zustellung, einmalig – oder von Hand im Admin (Bestellung → Karte „Bewertungsanfrage“, bzw. Häkchen „Bewertungsanfrage gleich mitschicken“ beim Statuswechsel auf *Zugestellt*) | Kund:in | Kurze Bitte um Bewertung, Hinweis, dass Fotos vom Strauß willkommen sind, Button zu `/bewertung?order={id}&token={tracking-token}`. Die Bewertung (Text, Sterne, bis zu 3 Fotos, Einwilligung) landet als „pending“ in `data/review-submissions.json` und wird im Admin unter *Eingereichte Bewertungen* geprüft – nichts wird automatisch veröffentlicht. |
| **Erinnerung bestätigen** | Formular unter `/erinnerung` (`POST /api/reminders`) | Nutzer:in | Double-Opt-in: Anlass, Datum, Vorlauf und Button „Erinnerung bestätigen“ (`/api/reminders/confirm?id&token`). Ohne Klick wird nie erinnert. |
| **Anlass-Erinnerung** | Cron `reminders`, 3/7/14 Tage vor dem Anlass | Nutzer:in | „{Anlass} von {Name} ist in 7 Tagen.“ mit Button zur passenden Anlass-Seite (`/anlaesse/{slug}`), Link zu `/blumen` und Lösch-Link (`/api/reminders/unsubscribe?id&token`). |
| **Magic-Link** | Kund:innen-Login (`templates.magicLink({ url, brandName })`, `sendMagicLink`) | Nutzer:in | Button „Jetzt anmelden“, Hinweis auf Gültigkeit (Standard 15 Minuten) und Einmal-Nutzung. |

## Datendateien

| Datei | Inhalt |
| --- | --- |
| `data/reminders.json` | Anlass-Erinnerungen (`id`, `email`, `occasionSlug`, `occasionLabel`, `personName`, `day`, `month`, `yearly`, `leadDays`, `confirmed`, `unsubscribeToken`, `lastSentYear`). Admin: `/admin/erinnerungen`. |
| `data/review-requests.json` | Pro Bestellung ein Eintrag: wann die (letzte) Bewertungsanfrage gesendet wurde (`sentAt`), von wem (`sentBy`: `cron` oder `admin`), wie oft (`sendCount`), ob bereits bewertet wurde (`submittedAt`) und die Einwilligung zur Veröffentlichung (`consent`: `{ at, text }` – Zeitpunkt und genauer Wortlaut). Die Einwilligung bleibt hier, auch wenn die Einreichung übernommen oder verworfen wird. |
| `data/review-submissions.json` | Eingereichte Bewertungen mit Status `pending`, inkl. Fotos (`photos`: `{ key, url, width, height }`) und Einwilligung. Admin: `/admin/bewertungen/eingereicht` → „Übernehmen“ schreibt sie nach `content/reviews.json` (`demo: false`, `verified: true`), mit den angehakten Fotos (`photos: [{ src, alt }]`, Alt-Text „Kundenfoto zu {Produkt}“); nicht angehakte Fotos und die Fotos verworfener Bewertungen werden gelöscht. |

Alle drei Dateien werden über `readData`/`writeData` aus `src/lib/cms.ts` gelesen und geschrieben und folgen damit derselben Storage-Abstraktion wie Bestellungen.

## Bewertungsanfrage von Hand

Auf der Bestellseite im Admin (`/admin/bestellungen/{id}`) zeigt die Karte **Bewertungsanfrage**, wann die Bestellung zugestellt wurde, wann (und ob automatisch oder manuell) die Anfrage zuletzt gesendet wurde und ob die Kund:in schon bewertet hat. „Bewertungsanfrage jetzt senden“ fragt nach Bestätigung und:

- geht nur bei hinterlegter E-Mail-Adresse, nicht bei stornierten oder schon bewerteten Bestellungen;
- warnt (erlaubt aber), wenn die Bestellung noch nicht *Zugestellt* ist – das Formular nimmt Bewertungen erst nach der Zustellung an;
- trägt `sentAt` in `data/review-requests.json` ein (der Cron schickt danach nichts mehr) und schreibt eine Notiz in den Bestellverlauf;
- ein zweiter Klick innerhalb von 10 Minuten sendet nicht noch einmal (Doppelklick-Schutz); später ist ein bewusstes erneutes Senden möglich.

Beim Statuswechsel auf *Zugestellt* gibt es dafür zusätzlich das Häkchen **„Bewertungsanfrage gleich mitschicken“** (nur sichtbar, solange noch keine Anfrage gesendet und nicht bewertet wurde).

## Fotos in Bewertungen

Das Formular unter `/bewertung` nimmt bis zu **3 Fotos** (JPEG, PNG, WebP, je max. 10 MB) mit Vorschau und Entfernen-Knopf an. Der Browser verkleinert sie vor dem Senden (max. 1600 px, damit drei Fotos in eine Anfrage passen – Netlify Functions nehmen höchstens ca. 6 MB pro Anfrage an). Der Server (`POST /api/reviews`, multipart) prüft zuerst das Rate-Limit, dann Felder, Einwilligung und Bestell-Token, erkennt das Format an den Bytes (`sharp`), dreht das Bild nach EXIF, entfernt alle Metadaten (EXIF, GPS), verkleinert auf max. 1600 px und speichert JPEG mit Qualität 80 – Details und Speicherorte in `docs/UPLOADS.md`. HEIC-Dateien kann das mitgelieferte `sharp` nicht dekodieren (nur AVIF aus der HEIF-Familie); iOS wandelt Fotos bei diesem Formular selbst in JPEG um, sonst gibt es eine verständliche Fehlermeldung.

Pflicht ist das Häkchen *„Ich bin einverstanden, dass Blumora meine Bewertung mit Vornamen und die hochgeladenen Fotos auf blumora.at zeigt.“* – gespeichert mit Zeitpunkt und Wortlaut (siehe Datendateien).

Im Shop erscheinen Fotos nur bei übernommenen, echten Bewertungen (`demo: false`, `verified: true`) als kleine Vorschaubilder unter dem Text (Produktseite und Startseite); ein Klick öffnet das Foto groß in einem Dialog. Die Produktgalerie bleibt unverändert.

## Schutz & Grenzen

- `POST /api/reminders` und `POST /api/reviews` sind pro IP auf 5 Anfragen pro Stunde begrenzt (`enforceRateLimit`, vor dem Lesen des Bodys) und haben ein Honeypot-Feld. `POST /api/reviews` lehnt Anfragen über 30,5 MB (`Content-Length`) ab, bevor etwas gelesen wird.
- Bestätigungs- und Lösch-Links tragen ein zufälliges Token (32 Hex-Zeichen); Bewertungslinks verwenden das Tracking-Token der Bestellung. Der Vergleich ist zeitkonstant.
- Der Rate-Limiter ist In-Memory (pro Prozess). Bei mehreren Instanzen/Serverless siehe Hinweis in `src/lib/rate-limit.ts`.
- Mails werden nach dem Speichern verschickt; ein Fehler beim Versand bricht weder Bestellung noch Statuswechsel ab (Log: `[mail] …`). Der Admin sieht in der Erfolgsmeldung, ob die Kund:in informiert wurde.

## Produktfotos in Mails

Bestellbestätigung und Auftragszettel zeigen das Foto des Straußes. Die Bilder kommen über den Bild-Dienst der Seite (`/_next/image?url=…&w=160|480`), also verkleinert und als JPEG für Mailprogramme ohne WebP. Voraussetzung: `NEXT_PUBLIC_SITE_URL` zeigt auf die öffentlich erreichbare Domain.

## Floristen-Budget

Das Max. Budget je Größe und Extra liegt im Laufzeit-Dokument `florist-budgets` (Datenbank). Solange dort nichts gespeichert ist, gelten die Startwerte aus der Preiskalkulation (Spalte „Einkauf Dody (Liste)“) – verschlüsselt in `src/lib/florist-budget-default.ts`, Schlüssel ist das Netlify-Secret `FLORIST_BUDGET_KEY` (ohne Schlüssel: keine Startwerte). Pflege und Import (JSON: `{ "products": { "<productId>": { "<sizeId>": 12.5 } }, "extras": { "<extraId>": 3 } }`) unter **Admin → Floristen-Budget**. Beim Bestellen wird der aktuelle Wert in die Bestellposition kopiert; Kundenansichten (`publicOrderView`) entfernen ihn.

## Newsletter (Double-Opt-in)

Anmeldung über das Formular oder die Checkbox in der Kasse speichert die Adresse als „wartet auf Bestätigung“ und schickt eine Bestätigungsmail. Der Link führt auf `/newsletter/bestaetigen`, erst der Knopf dort (POST – Mail-Scanner öffnen nur Links) bestätigt. Abmelden: `/newsletter/abmelden?id=…&token=…` (in jeden Newsletter einbauen). Newsletter nur an bestätigte Adressen; der CSV-Export im Admin enthält nur diese. Ohne Mailversand antwortet die Anmeldung mit 503, statt eine Adresse ohne Bestätigungsmöglichkeit zu sammeln.
