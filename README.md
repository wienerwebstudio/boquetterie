# Bloomery – Blumenversand Wien

Ein moderner, conversion-optimierter Webshop für einen Blumenlieferdienst in Wien und Umgebung.
Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Zustand · Admin-Bereich · Datenspeicher wahlweise JSON-Dateien oder Postgres.

## Schnellstart

```bash
npm install
cp .env.example .env.local   # ADMIN_PASSWORD & ADMIN_SECRET setzen
npm run dev                   # http://localhost:3000
npm run build && npm start    # Produktion
npm run test:unit             # Vitest
npm run test:e2e              # Playwright (startet den Dev-Server selbst)
npm run test:a11y             # axe-core Scans (Desktop + Mobil)
```

Alle optionalen Integrationen (Stripe, PayPal, Resend, Postgres, S3, Analytics) werden nur über Umgebungsvariablen aktiviert – `.env.example` listet und erklärt sie alle.

## Struktur

| Pfad | Inhalt |
| --- | --- |
| `content/*.json` | Alle redaktionell pflegbaren Inhalte: Produkte, Anlässe, Kategorien, Extras, Liefergebiete, Gutscheine, FAQs, Bewertungen, Abo, Einstellungen, Startseite, Seiten, Landingpages. Ohne Datenbank die Quelle, mit Postgres der Seed |
| `data/*.json` | Laufzeitdaten (Bestellungen, Newsletter, Kontaktanfragen) – nicht versioniert; nur im JSON-Modus |
| `src/lib/store` | Datenspeicher-Abstraktion: `json` (Dateien, Standard) oder `postgres` (Tabelle `documents`), gewählt über `DATABASE_URL` – siehe `docs/DATABASE.md` |
| `scripts/db-*.mjs` | `npm run db:migrate` (Tabelle anlegen), `npm run db:seed` (JSON → Postgres importieren) |
| `Dockerfile`, `docker-compose.yml` | Produktions-Image (Standalone) + Postgres – siehe `docs/DEPLOYMENT.md` |
| `src/app` | Routen (Shop, Produkt, Checkout, Bestellstatus, Admin, Landingpages, Rechtliches) |
| `src/components` | `ui/` Designsystem · `layout/` Header/Footer · `home/`, `shop/`, `product/`, `cart/`, `checkout/`, `content/`, `admin/` |
| `src/lib` | `cms.ts` (einzige Datenzugriffs-Schicht, nutzt `store/`), `delivery.ts` (Lieferlogik), `catalog.ts` (Filter/Suche), `pricing.ts`, `orders.ts`, `seo.tsx` |
| `src/store` | Zustand-Stores: Warenkorb (persistiert), UI, Favoriten, Lieferkontext |
| `public/images` | Markenbilder (Produkte, Anlässe, Extras, Editorial, Galerie, Hero) |
| `public/uploads` | Im Admin hochgeladene Bilder (lokaler Treiber; alternativ S3/R2 – `docs/UPLOADS.md`) |
| `tests/` | Vitest-Unit-Tests (`tests/unit`), Playwright-E2E und axe-Barrierefreiheitstests (`tests/e2e`) – `docs/TESTING.md` |

## Geschäftslogik

- **Lieferzonen** (`content/delivery-zones.json`): PLZ-Bereiche, Lieferpreis, Gratis-ab, Mindestbestellwert, Liefertage, Cut-off, Vorlauf, Same-Day + Same-Day-Cut-off, Zeitfenster. Die Engine in `src/lib/delivery.ts` entscheidet anhand von Uhrzeit (Europe/Vienna), PLZ, Produkt und Sperrtagen, welche Tage angeboten werden – nichts ist im Frontend hart codiert.
- **Preise** werden clientseitig aus Warenkorb-Snapshots angezeigt und serverseitig bei Bestellanlage aus dem Katalog neu berechnet.
- **Bestellstatus**: eingegangen → bezahlt → in Vorbereitung → wird gebunden → bereit → unterwegs → zugestellt (bzw. nicht zustellbar / storniert). Kund:innen sehen eine Statusseite über Bestellnummer + Token.
- **Zahlungen**: Provider-Abstraktion in `src/lib/payments.ts` + `src/lib/payments/`. Stripe (Karte, Apple Pay, Google Pay, EPS, Klarna über das Payment Element) und PayPal (Orders API v2) werden rein über Umgebungsvariablen aktiviert; ohne Schlüssel läuft der `mock`-Provider (Testmodus, deutlich gekennzeichnet). Lagerbestand wird bei Bestellanlage reserviert und bei Zahlungsabbruch/Storno freigegeben; Webhooks sind die Quelle der Wahrheit. Details: `docs/PAYMENTS.md`.
- **E-Mails**: Resend (oder Konsole ohne Key) für Bestellbestätigung, Statusupdates, Admin-Benachrichtigung, Bewertungsanfrage, Anlass-Erinnerungen und Login-Links; Cron-Endpunkte unter `/api/cron/*`. Details: `docs/MAIL.md`.
- **Kundenkonten** ohne Passwort (Magic Link): Bestellungen, Empfänger:innen, Favoriten, Profil. Details: `docs/ACCOUNTS.md`.
- **Geschenkfinder** (`/geschenkfinder`), **Anlass-Erinnerungen** (`/erinnerung`), **Firmenkunden** (`/firmenkunden`), **Bewertungen einreichen** (`/bewertung`, Freigabe im Admin).
- **Cookie-Consent + Analytics** (Plausible und/oder GA4, nur nach Einwilligung): `docs/ANALYTICS.md`.
- **Sicherheit**: Rate-Limits auf allen öffentlichen APIs, Honeypots, signierte Cookies, Security-Header. Details: `docs/SECURITY.md`.

## Administration

`/admin` (Passwortschutz über `ADMIN_PASSWORD`). Details in `docs/ADMIN.md`. Neben Inhalten und Bestellungen: Medienbibliothek mit Upload, eingereichte Bewertungen freigeben, Anlass-Erinnerungen einsehen.

Der Admin schreibt in denselben Datenspeicher, aus dem der Shop liest: ohne `DATABASE_URL` direkt in `content/*.json` und `data/*.json` (beschreibbares Dateisystem nötig), mit `DATABASE_URL` in Postgres. Auf serverlosen Plattformen (Vercel) ist Postgres Pflicht. Umstieg, Seed und Backup: `docs/DATABASE.md` · Docker/Vercel: `docs/DEPLOYMENT.md`.

## Platzhalter

Firmendaten, Rechtstexte (Impressum, Datenschutz, AGB, Widerruf), Unternehmensgeschichte und echte Bewertungen sind als klar gekennzeichnete Platzhalter angelegt und müssen vor dem Launch ergänzt werden. Beispielbewertungen sind mit `demo: true` markiert und werden im Shop entsprechend gekennzeichnet.

## Bilder

Die Markenbilder wurden KI-gestützt in einem einheitlichen Editorial-Stil erzeugt (`scripts/fetch-images.mjs` dokumentiert den Import). Für den Launch sollten sie durch echte Produktfotos im selben Stil ersetzt oder ergänzt werden.
