# Boquetterie – Admin-Bereich

Der Admin-Bereich liegt unter **`/admin`** und ist für Mitarbeiter:innen ohne Programmierkenntnisse gedacht.

## Anmelden

1. In `.env.local` (Vorlage: `.env.example`) `ADMIN_PASSWORD` setzen. Optional `ADMIN_SECRET` (langer Zufallswert, signiert das Login-Cookie; ohne ihn wird das Passwort als Secret verwendet).
2. `/admin/login` aufrufen und das Passwort eingeben. Die Sitzung gilt 12 Stunden (Cookie `bq_admin`, httpOnly, signiert mit HMAC-SHA256).
3. Abmelden über den Button unten in der Navigation.

Ist `ADMIN_PASSWORD` nicht gesetzt, zeigt die Login-Seite einen Hinweis und verweigert jede Anmeldung. Die Absicherung passiert in `src/proxy.ts` (für `/admin/*` und `/api/admin/*`) **und** zusätzlich in jeder Server Action (`requireAdmin()`).

## Was kann bearbeitet werden?

| Bereich | URL | Datei |
| --- | --- | --- |
| Übersicht (Kennzahlen, neueste Bestellungen) | `/admin` | – |
| Bestellungen (Liste, Detail, Status + Notiz, interne Notiz) | `/admin/bestellungen` | `data/orders.json` |
| Produkte (Größen/Preise, Bilder, Zuordnung, Lager, Same-Day, SEO) | `/admin/produkte` | `content/products.json` |
| Kategorien (inkl. Regeln) | `/admin/kategorien` | `content/categories.json` |
| Anlässe | `/admin/anlaesse` | `content/occasions.json` |
| Extras | `/admin/extras` | `content/extras.json` |
| Liefergebiete (PLZ, Gebühren, Liefertage, Fristen, Zeitfenster) | `/admin/liefergebiete` | `content/delivery-zones.json` |
| Gutscheine | `/admin/gutscheine` | `content/coupons.json` |
| FAQ | `/admin/faq` | `content/faqs.json` |
| Bewertungen | `/admin/bewertungen` | `content/reviews.json` |
| Blumen-Abo (Pläne, Rhythmen, Texte) + Anfragen | `/admin/blumen-abo`, `/admin/blumen-abo/anfragen` | `content/subscription.json`, `data/subscription-requests.json` |
| Startseite (alle Abschnitte) | `/admin/startseite` | `content/homepage.json` |
| Seiten (Über uns, Lieferung, Kontakt, Impressum, …) | `/admin/seiten` | `content/pages.json` |
| Landingpages | `/admin/landingpages` | `content/landing-pages.json` |
| Einstellungen (Marke/Kontakt, Ankündigung, Funktionen, Sperrtage, Zahlungsarten, Bestellstatus, SEO, Vertrauenselemente) | `/admin/einstellungen` | `content/settings.json` |
| Newsletter (Liste + CSV-Export) | `/admin/newsletter`, `/api/admin/newsletter.csv` | `data/newsletter.json` |

### Bedienung

- **Neu**-Button auf jeder Liste → leeres Formular. IDs und Slugs werden automatisch aus dem Namen erzeugt, wenn sie leer bleiben.
- Bilder werden als Pfad unter `/public` eingetragen (z. B. `/images/products/amour-1.jpg`) und im Formular als Vorschau angezeigt. Dateien vorher hochladen (Git/FTP).
- Listen (Größen, Zeitfenster, Bilder, Abschnitte) haben Zeilen, die hinzugefügt, sortiert und entfernt werden können.
- **JSON-Modus** (Schalter oben rechts): Rohdaten direkt bearbeiten – für Power-User. Ungültiges JSON wird abgewiesen.
- Nach dem Speichern wird der Shop sofort aktualisiert (`revalidatePath("/", "layout")`).
- Der Preis „ab“ eines Produkts wird automatisch aus der günstigsten Größe berechnet.

## Wo liegen die Daten?

- `content/*.json` – redaktionelle Inhalte, versioniert in Git. Der Admin schreibt die Dateien direkt (atomar über eine temporäre Datei).
- `data/*.json` – Laufzeitdaten (Bestellungen, Newsletter, Abo-Anfragen), nicht versioniert.

Beim Deployment muss das Dateisystem beschreibbar sein (klassischer Node-Server, Docker-Volume). Auf rein serverlosen Plattformen ohne persistente Festplatte gehen Änderungen verloren – dann Datenbank anbinden (siehe unten).

## Technischer Aufbau

- `src/proxy.ts` – Cookie-Prüfung für `/admin/*` und `/api/admin/*` (Web Crypto, läuft auch auf Edge).
- `src/lib/admin-auth.ts` – Signieren/Prüfen des Session-Tokens; `src/lib/admin-session.ts` – `requireAdmin()` für Server Actions.
- `src/app/api/admin/login|logout` – Login/Logout-Endpunkte; `src/app/admin/login` – Login-Seite.
- `src/components/admin/schemas.ts` – **Feldschemata** aller Entitäten. Neue Felder = hier eine Zeile ergänzen; Formular und Validierung folgen automatisch.
- `src/components/admin/entity-form.tsx` – generisches Formular (Text, Zahl, Ja/Nein, Auswahl, Mehrfachauswahl, Tags, Listen, Bild, Datum, Uhrzeit, JSON-Modus).
- `src/app/admin/actions.ts` – `saveEntity`, `deleteEntity`, `saveSingleton` (Validierung + Schreiben über `cms.ts`).
- `src/app/admin/bestellungen/actions.ts` – Statuswechsel und interne Notiz für Bestellungen.
- `src/app/admin/[collection]/…` – generische Listen-/Bearbeitungsseiten; `einstellungen`, `startseite`, `blumen-abo` – Singleton-Editoren.

## Datenbank statt JSON-Dateien

Der Shop läuft ohne Konfiguration mit den JSON-Dateien in `content/` und `data/`. Sobald `DATABASE_URL` gesetzt ist, liegen alle Inhalte und Laufzeitdaten in Postgres – der Admin-Code bleibt unverändert, weil er nur die typisierten Getter aus `src/lib/cms.ts` kennt. Einrichtung, Migration und Seed: siehe `docs/DATABASE.md`; Hosting-Optionen: `docs/DEPLOYMENT.md`.
