# Boquetterie – E-Mail, Erinnerungen & Cron

Transaktionale E-Mails (Bestellbestätigung, Statusupdates, Bewertungsanfrage, Anlass-Erinnerungen, Magic-Link) laufen über `src/lib/mail.ts`. Die Vorlagen liegen in `src/lib/mail/templates.ts` (reine Funktionen, liefern `{ subject, html, text }`).

## Umgebungsvariablen

| Variable | Pflicht | Beschreibung |
| --- | --- | --- |
| `RESEND_API_KEY` | für echten Versand | API-Key von [Resend](https://resend.com). Ohne Key werden alle Mails nur ins Server-Log geschrieben (`[mail] (console provider) …`) – praktisch für Entwicklung und Previews. |
| `MAIL_FROM` | ja (bei Resend) | Absender, z. B. `Boquetterie <hallo@boquetterie.at>`. Die Domain muss bei Resend verifiziert sein (siehe unten). Fallback: `Boquetterie <no-reply@example.com>`. |
| `MAIL_REPLY_TO` | nein | Reply-To-Adresse, z. B. das Team-Postfach. Antworten von Kund:innen landen dort. |
| `MAIL_ADMIN` | nein | Interne Adresse, die bei jeder neuen Bestellung eine kompakte Zusammenfassung mit Link in den Admin bekommt. Leer = keine internen Mails. |
| `CRON_SECRET` | für Cron | Geheimnis, das die Cron-Endpunkte unter `/api/cron/*` schützt. Anfragen müssen `Authorization: Bearer <CRON_SECRET>` senden. Erzeugen z. B. mit `openssl rand -hex 32`. Ohne Wert antworten die Endpunkte mit 503. |

Die öffentliche URL (für Links in Mails) kommt **nicht** aus einer Env-Variable, sondern aus `content/settings.json` → `seo.siteUrl` (im Admin unter Einstellungen → SEO). Markenname, Claim und Kontakt-Mail stammen ebenfalls aus den Einstellungen; Platzhalter-Werte (`[…]`) werden nie in Mails ausgegeben.

Beispiel `.env.local`:

```
RESEND_API_KEY=re_xxxxxxxxx
MAIL_FROM="Boquetterie <hallo@boquetterie.at>"
MAIL_REPLY_TO=hallo@boquetterie.at
MAIL_ADMIN=bestellungen@boquetterie.at
CRON_SECRET=<openssl rand -hex 32>
```

## Domain bei Resend verifizieren (SPF / DKIM)

Damit Mails von `@boquetterie.at` nicht im Spam landen, muss die Domain bei Resend verifiziert werden:

1. Resend → **Domains** → **Add Domain** → `boquetterie.at` (Region EU wählen, wenn verfügbar).
2. Resend zeigt DNS-Einträge an, die beim Domain-Registrar (z. B. World4You, nic.at-Provider) angelegt werden:
   - **DKIM**: ein `TXT`-Eintrag unter `resend._domainkey.boquetterie.at` (Wert = öffentlicher Schlüssel von Resend). Signiert jede Mail kryptografisch.
   - **SPF**: ein `TXT`-Eintrag (bei Resend meist auf einer Subdomain wie `send.boquetterie.at`) mit `v=spf1 include:amazonses.com ~all` sowie ein passender `MX`-Eintrag für Bounces. Besteht bereits ein SPF-Eintrag auf der Root-Domain, wird der `include:` dort ergänzt – es darf nur **einen** SPF-Eintrag pro Name geben.
   - Optional **DMARC**: `TXT` unter `_dmarc.boquetterie.at`, z. B. `v=DMARC1; p=none; rua=mailto:postmaster@boquetterie.at` (erst beobachten, später auf `quarantine` verschärfen).
3. Nach dem Eintragen in Resend auf **Verify** klicken. DNS-Änderungen brauchen bis zu 24–48 h, meist geht es in Minuten.
4. Erst dann `MAIL_FROM` auf die echte Domain setzen. Vorher liefert Resend nur an die eigene Account-Adresse (Sandbox).

## Cron-Endpunkte

Beide Endpunkte akzeptieren `GET` und `POST`, brauchen `Authorization: Bearer $CRON_SECRET` und liefern JSON mit einer kleinen Statistik zurück. Sie sind idempotent – mehrfaches Aufrufen am selben Tag schickt nichts doppelt.

| Endpunkt | Was passiert | Empfohlen |
| --- | --- | --- |
| `/api/cron/reminders` | Verschickt bestätigte Anlass-Erinnerungen, deren Sendefenster (Anlass − Vorlauftage) heute (Europe/Vienna) erreicht ist. Jährliche Erinnerungen bekommen `lastSentYear`, einmalige werden nach dem Versand gelöscht. Unbestätigte Einträge älter als 30 Tage werden entfernt. | 1× täglich am Vormittag |
| `/api/cron/review-requests` | Verschickt „Wie war der Strauß?“ einmalig für Bestellungen mit Status *Zugestellt*, 2–30 Tage nach der Zustellung (Zeitpunkt aus dem Bestellverlauf). Versendete Bestellungen stehen in `data/review-requests.json`. | 1× täglich |

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
0  8 * * *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://boquetterie.at/api/cron/reminders
30 8 * * *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://boquetterie.at/api/cron/review-requests
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
| **Neue Bestellung (intern)** | gleichzeitig mit der Bestätigung | `MAIL_ADMIN` | Kompakte Zusammenfassung (Lieferung, Empfänger:in mit Telefon, Kund:in, Positionen, Grußkarte, Zahlung, Gesamt) und Button zu `/admin/bestellungen/{id}`. Betreff enthält Nummer, Betrag und Liefertag. |
| **Statusupdate** | Statuswechsel im Admin auf einen Status mit `customerVisible: true` (`sendOrderStatusUpdate`) | Kund:in | Headline und Text pro Status (Zahlung bestätigt, In Vorbereitung, Strauß wird gebunden, Bereit, Unterwegs, Zugestellt). *Nicht zustellbar* und *Storniert* bekommen einen hervorgehobenen Hinweis, die Notiz zum Statuswechsel (bei „Nicht zustellbar“) und die Kontaktadresse. Immer mit Link zur Statusseite. Interne Notizen lösen nie eine Mail aus; ein „Wechsel“ auf denselben Status auch nicht. |
| **Bewertungsanfrage** | Cron `review-requests`, 2–30 Tage nach Zustellung, einmalig | Kund:in | Kurze Bitte um Bewertung mit Button zu `/bewertung?order={id}&token={tracking-token}`. Die Bewertung landet als „pending“ in `data/review-submissions.json` und wird im Admin unter *Eingereichte Bewertungen* geprüft – nichts wird automatisch veröffentlicht. |
| **Erinnerung bestätigen** | Formular unter `/erinnerung` (`POST /api/reminders`) | Nutzer:in | Double-Opt-in: Anlass, Datum, Vorlauf und Button „Erinnerung bestätigen“ (`/api/reminders/confirm?id&token`). Ohne Klick wird nie erinnert. |
| **Anlass-Erinnerung** | Cron `reminders`, 3/7/14 Tage vor dem Anlass | Nutzer:in | „{Anlass} von {Name} ist in 7 Tagen.“ mit Button zur passenden Anlass-Seite (`/anlaesse/{slug}`), Link zu `/blumen` und Lösch-Link (`/api/reminders/unsubscribe?id&token`). |
| **Magic-Link** | Kund:innen-Login (`templates.magicLink({ url, brandName })`, `sendMagicLink`) | Nutzer:in | Button „Jetzt anmelden“, Hinweis auf Gültigkeit (Standard 15 Minuten) und Einmal-Nutzung. |

## Datendateien

| Datei | Inhalt |
| --- | --- |
| `data/reminders.json` | Anlass-Erinnerungen (`id`, `email`, `occasionSlug`, `occasionLabel`, `personName`, `day`, `month`, `yearly`, `leadDays`, `confirmed`, `unsubscribeToken`, `lastSentYear`). Admin: `/admin/erinnerungen`. |
| `data/review-requests.json` | Pro Bestellung: wann die Bewertungsanfrage gesendet wurde (`sentAt`) und ob bereits bewertet wurde (`submittedAt`). |
| `data/review-submissions.json` | Eingereichte Bewertungen mit Status `pending`. Admin: `/admin/bewertungen/eingereicht` → „Übernehmen“ schreibt sie nach `content/reviews.json` (`demo: false`, `verified: true`). |

Alle drei Dateien werden über `readData`/`writeData` aus `src/lib/cms.ts` gelesen und geschrieben und folgen damit derselben Storage-Abstraktion wie Bestellungen.

## Schutz & Grenzen

- `POST /api/reminders` und `POST /api/reviews` sind pro IP auf 5 Anfragen pro Stunde begrenzt (`enforceRateLimit`) und haben ein Honeypot-Feld.
- Bestätigungs- und Lösch-Links tragen ein zufälliges Token (32 Hex-Zeichen); Bewertungslinks verwenden das Tracking-Token der Bestellung. Der Vergleich ist zeitkonstant.
- Der Rate-Limiter ist In-Memory (pro Prozess). Bei mehreren Instanzen/Serverless siehe Hinweis in `src/lib/rate-limit.ts`.
- Mails werden nach dem Speichern verschickt; ein Fehler beim Versand bricht weder Bestellung noch Statuswechsel ab (Log: `[mail] …`). Der Admin sieht in der Erfolgsmeldung, ob die Kund:in informiert wurde.
