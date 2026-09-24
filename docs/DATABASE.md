# Bloomery – Datenspeicher (JSON oder Postgres)

Der Shop speichert Inhalte und Laufzeitdaten als **JSON-Dokumente**. Wo diese Dokumente liegen, entscheidet ausschließlich die Umgebungsvariable `DATABASE_URL`:

| `DATABASE_URL` | Store | Ablage |
| --- | --- | --- |
| nicht gesetzt (Standard, Entwicklung) | `json` | `content/*.json` (versioniert) und `data/*.json` (Laufzeit, git-ignoriert) |
| gesetzt, z. B. `postgres://user:pass@host:5432/db` | `postgres` | Tabelle `documents` in Postgres |

Am Code ändert sich nichts: Seiten, Server Actions und API-Routen sprechen nur mit `src/lib/cms.ts` (`readCollection`, `writeCollection`, `getSettings`, `getOrders`, `addOrder`, `readData`, `writeData`, …). Die Signaturen sind für beide Stores identisch.

## Aufbau

```
src/lib/cms.ts            – öffentliche API (unverändert), wählt den Store über getStore()
src/lib/store/types.ts    – DocumentStore { get(kind, name), set(kind, name, value) }
src/lib/store/json.ts     – Dateien: mtime-Cache, atomares Schreiben (tmp + rename)
src/lib/store/postgres.ts – postgres.js-Client, Tabelle `documents`, Content-Cache (5 s)
src/lib/store/index.ts    – getStore(): postgres wenn DATABASE_URL gesetzt, sonst json
scripts/db-migrate.mjs    – Tabelle anlegen            → npm run db:migrate
scripts/db-seed.mjs       – content/ + data/ importieren → npm run db:seed [-- --force] [-- --only content|data]
```

Jedes Dokument hat eine Art (`kind`) und einen Namen:

- `content` – redaktionelle Inhalte (`products`, `settings`, `homepage`, …). Werden vom Admin geschrieben.
- `data` – Laufzeitdaten (`orders`, `newsletter`, `subscription-requests`, `reminders`, …).

Beim Start loggt der Server einmal, welcher Store aktiv ist: `[bloomery] datastore: json …` bzw. `… postgres …`.

## Postgres-Schema

Eine einzige Tabelle; sie wird von `npm run db:migrate`, `npm run db:seed` **und** vom Store selbst beim ersten Zugriff (`create table if not exists`) angelegt:

```sql
create table if not exists documents (
  kind       text        not null,            -- 'content' | 'data'
  name       text        not null,            -- z. B. 'products', 'orders'
  data       jsonb       not null,            -- das komplette Dokument
  updated_at timestamptz not null default now(),
  primary key (kind, name)
);
```

`get` liest `data` (oder `null`, wenn die Zeile fehlt), `set` macht ein Upsert (`insert … on conflict (kind, name) do update`). Der DB-User braucht `CREATE` im Schema (für die Tabelle) sowie `SELECT/INSERT/UPDATE` auf `documents`.

### Fallback auf die JSON-Dateien

Fehlt ein **Content**-Dokument in der Datenbank (frische Datenbank, neuer Content-Typ), liest `cms.ts` die Datei `content/<name>.json` aus dem Deployment und schreibt sie beim ersten Lesen in die Datenbank. Ein neues Deployment funktioniert damit ohne manuellen Import; danach ist die Datenbank die Quelle der Wahrheit – spätere Änderungen an `content/*.json` im Repo werden **nicht** automatisch übernommen (dafür `npm run db:seed -- --force --only content`).

Für **Laufzeitdaten** gibt es keinen Fallback: Fehlt `data/orders` in der Datenbank, ist die Bestellliste leer. Bestehende `data/*.json` einmalig mit `npm run db:seed` importieren (siehe unten).

### Caching

- Content-Dokumente werden pro Prozess 5 Sekunden im Speicher gehalten; parallele Lesezugriffe auf dasselbe Dokument werden zu einer Abfrage zusammengefasst. Ein `set` aktualisiert den Cache sofort, der Admin sieht seine Änderung also ohne Verzögerung. Bei mehreren Instanzen kann eine andere Instanz bis zu 5 s alte Inhalte liefern (zusätzlich zu Next.js' eigenem Cache/`revalidatePath`).
- `data`-Dokumente werden **nie** gecacht (Read-Modify-Write bei Bestellungen, Statusseite).
- Der JSON-Store cacht pro Datei und prüft die `mtime`, externe Änderungen (git pull, Editor) greifen sofort.

### Grenzen

- Ein Dokument = eine Zeile. `orders` ist also eine Liste in einer `jsonb`-Zelle – für einen Blumenladen mit einigen tausend Bestellungen völlig ausreichend, aber keine relationale Bestell-Tabelle. Zwei gleichzeitige Schreibvorgänge auf dasselbe Dokument (z. B. zwei Bestellungen in derselben Millisekunde) gewinnen nach „last write wins“ – genau wie beim JSON-Store. Wer das ausschließen will, splittet `orders` später in eine eigene Tabelle; nur `src/lib/cms.ts` muss dafür angepasst werden.
- Große Dokumente (`products` ≈ 30 kB) werden bei jedem Cache-Miss vollständig geladen; mit dem 5-s-Cache ist das unproblematisch.

## Umgebungsvariablen

| Variable | Pflicht | Bedeutung |
| --- | --- | --- |
| `DATABASE_URL` | für Postgres | Verbindungs-URL, z. B. `postgres://bloomery:geheim@db:5432/bloomery`. Nicht gesetzt = JSON-Store. `?sslmode=require` in der URL wird von postgres.js respektiert. |
| `DATABASE_SSL` | nein | `require` erzwingt TLS (Neon, Supabase, Managed-DBs), `disable` schaltet es ab. Ohne Wert entscheidet die URL. |
| `DATABASE_POOL_MAX` | nein | Max. Verbindungen pro Prozess, Standard `5`. Bei Serverless (Vercel) `1`–`3`. |
| `DATABASE_PREPARE` | nein | `false` deaktiviert Prepared Statements – nötig hinter Transaction-Poolern (PgBouncer, Supabase-Pooler). Bei `?pgbouncer=true` in der URL passiert das automatisch. |

Die Scripts lesen `DATABASE_URL` aus der Umgebung, sonst aus `.env.local`, dann `.env`.

## Migration & Seed

```bash
# 1) Tabelle anlegen (idempotent)
DATABASE_URL=postgres://… npm run db:migrate

# 2) content/*.json und data/*.json importieren – vorhandene Dokumente bleiben unangetastet
npm run db:seed

# Varianten
npm run db:seed -- --force            # vorhandene Dokumente mit den JSON-Dateien überschreiben
npm run db:seed -- --only content     # nur Inhalte (oder: --only data)
```

Das Script gibt eine Zusammenfassung aus (`inserted / updated / skipped`) und beendet sich mit Exit-Code 1 bei Fehlern.

### Von JSON auf Postgres umziehen (Produktion)

1. Postgres bereitstellen (Docker-Compose-Service `db`, Neon, Supabase, …).
2. Aktuellen Stand sichern: `content/` ist in Git, `data/*.json` vom Server kopieren.
3. Mit dem **laufenden** Stand seeden: `DATABASE_URL=… npm run db:seed` (auf dem Server oder lokal mit den kopierten Dateien). So landen auch Bestellungen und Newsletter-Adressen in der Datenbank.
4. `DATABASE_URL` in der Umgebung setzen und die App neu starten. Log prüfen: `datastore: postgres`.
5. Ab jetzt nur noch über den Admin bzw. die Datenbank ändern. `content/*.json` im Repo dient nur noch als Seed für neue Umgebungen.

Zurück zu JSON: `DATABASE_URL` entfernen. Die Dateien in `content/` und `data/` (Docker-Volume) sind dann wieder die Quelle – Änderungen aus der Datenbank vorher exportieren (siehe Backup).

## Backup & Restore

**Postgres**

```bash
# Backup (Docker Compose)
docker compose exec db pg_dump -U bloomery -Fc bloomery > backup-$(date +%F).dump
# Restore
docker compose exec -T db pg_restore -U bloomery -d bloomery --clean --if-exists < backup-2026-01-01.dump

# Einzelne Dokumente als JSON exportieren (z. B. zurück ins Repo)
docker compose exec db psql -U bloomery -d bloomery -Atc \
  "select data from documents where kind='content' and name='products'" > content/products.json
```

Managed-Anbieter (Neon, Supabase) bieten Point-in-Time-Recovery bzw. tägliche Backups; zusätzlich regelmäßig `pg_dump` extern ablegen.

**JSON-Store**: `content/` ist in Git; `data/` (und `public/uploads/`) regelmäßig sichern – z. B. `tar czf data-$(date +%F).tgz data public/uploads` aus einem Cronjob.

## Entwicklung

- Standard bleibt der JSON-Store, es ist keine Datenbank nötig.
- Postgres lokal testen: `docker compose up -d db`, dann `DATABASE_URL=postgres://bloomery:bloomery@localhost:5432/bloomery npm run dev` (Port 5432 in `docker-compose.yml` freigeben).
- In `src/lib/store/postgres.ts` wird der Client an `globalThis` gehängt, damit Hot Reloading keine neuen Verbindungspools öffnet.
