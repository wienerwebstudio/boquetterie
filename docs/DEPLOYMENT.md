# Boquetterie – Deployment

Zwei erprobte Wege: **A) Docker auf einem eigenen Server** (empfohlen: volle Kontrolle, JSON-Fallback und lokale Uploads funktionieren) oder **B) Vercel + gehostetes Postgres**. Der Datenspeicher ist in `docs/DATABASE.md` beschrieben, Uploads in `docs/UPLOADS.md`, Mail/Cron in `docs/MAIL.md`, Zahlungen in `docs/PAYMENTS.md`.

## Umgebungsvariablen (beide Optionen)

| Variable | Pflicht | Bedeutung |
| --- | --- | --- |
| `ADMIN_PASSWORD` | ja | Passwort für `/admin` |
| `ADMIN_SECRET` | empfohlen | Signiert das Admin-Cookie (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_SITE_URL` | ja | Öffentliche URL, z. B. `https://boquetterie.at` – wird **beim Build** in den Client-Code eingebettet |
| `DATABASE_URL` | Option B: ja · Option A: empfohlen | Postgres-URL; ohne sie JSON-Dateien (siehe `docs/DATABASE.md`) |
| `DATABASE_SSL`, `DATABASE_POOL_MAX`, `DATABASE_PREPARE` | nein | Feineinstellungen, siehe `docs/DATABASE.md` |
| `CRON_SECRET` | für Erinnerungen/Bewertungsanfragen | Schützt `/api/cron/*` (siehe `docs/MAIL.md`) |
| `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_ADMIN`, `MAIL_REPLY_TO` | für E-Mail | siehe `docs/MAIL.md` |
| `AUTH_SECRET` | für Kundenkonten | siehe `docs/ACCOUNTS.md` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `PAYPAL_*` | für echte Zahlungen | siehe `docs/PAYMENTS.md` |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_PREFIX`, `S3_PUBLIC_URL`, `UPLOADS_PUBLIC_HOST` | Option B: ja · Option A: optional | Bild-Uploads in S3-kompatiblen Speicher, siehe `docs/UPLOADS.md` |
| `WEB_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | nur Docker Compose | Host-Port und Zugangsdaten des `db`-Containers |

---

## Option A – Docker auf einem VPS (Docker Compose + Caddy)

Enthalten: `Dockerfile` (Multi-Stage, Next.js `output: "standalone"`, läuft als Nicht-Root-User `nextjs`, Port 3000), `docker-compose.yml` (Services `web` + `db`), `.dockerignore`.

### 1. Server vorbereiten

Ubuntu/Debian mit Docker Engine + Compose-Plugin, DNS-A-Record der Domain auf den Server.

```bash
git clone <repo> /srv/boquetterie && cd /srv/boquetterie
cp .env.example .env
```

`.env` (wird von Docker Compose für die Variablen-Substitution gelesen und **nicht** ins Image kopiert):

```dotenv
ADMIN_PASSWORD=<sicheres Passwort>
ADMIN_SECRET=<openssl rand -hex 32>
NEXT_PUBLIC_SITE_URL=https://boquetterie.at
POSTGRES_PASSWORD=<openssl rand -hex 24>
CRON_SECRET=<openssl rand -hex 32>
# RESEND_API_KEY=… MAIL_FROM=… (docs/MAIL.md), STRIPE_* (docs/PAYMENTS.md)
```

Weitere Variablen (Mail, Stripe, S3) im `environment:`-Block von `web` in `docker-compose.yml` ergänzen bzw. per `env_file: .env` durchreichen.

Volumes: `./data` (JSON-Fallback für Laufzeitdaten) und `./public/uploads` (lokale Bild-Uploads) werden in den Container gemountet. Der Container läuft als UID 1001 – einmalig:

```bash
mkdir -p data public/uploads && sudo chown -R 1001:1001 data public/uploads
```

### 2. Starten

```bash
docker compose up -d --build
docker compose logs -f web      # erwartet: "[boquetterie] datastore: postgres …"
```

`DATABASE_URL` zeigt in Compose auf den `db`-Service; die Tabelle wird beim ersten Zugriff angelegt, Inhalte kommen beim ersten Lesen aus `content/*.json` (Fallback). Bestehende Bestellungen/Newsletter aus einem früheren JSON-Betrieb einmalig importieren:

```bash
docker compose exec web node scripts/db-seed.mjs            # data/ ist als Volume eingebunden
docker compose exec web node scripts/db-seed.mjs --force    # Inhalte aus dem Repo-Stand erzwingen
```

Ohne Datenbank betreiben: `DATABASE_URL` in `docker-compose.yml` entfernen, Service `db` löschen und zusätzlich `./content:/app/content` als Volume mounten, damit Admin-Änderungen ein Rebuild überleben.

### 3. Reverse Proxy mit Caddy (HTTPS automatisch)

`/etc/caddy/Caddyfile`:

```caddyfile
boquetterie.at, www.boquetterie.at {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
    request_body {
        max_size 12MB    # Bild-Uploads im Admin
    }
}
```

`sudo systemctl reload caddy`. Caddy holt und erneuert das Zertifikat selbst. (Alternativ Caddy als weiteren Compose-Service mit Port 80/443 und `reverse_proxy web:3000`.)

### 4. Updates, Cron, Backups

```bash
cd /srv/boquetterie && git pull && docker compose up -d --build   # neues Image, DB bleibt
```

- Cron-Endpunkte (`/api/cron/reminders`, `/api/cron/review-requests`) per Crontab aufrufen – Beispiel in `docs/MAIL.md`.
- Backups: `pg_dump` des `db`-Containers + `public/uploads` + `data/` – Befehle in `docs/DATABASE.md`.
- Healthcheck: `curl -I https://boquetterie.at/` (200) und `docker compose ps` (db „healthy“).

### Hinweise zum Image

- Build-Stage baut **ohne** `DATABASE_URL`; das Prerendering liest `content/*.json`. Zur Laufzeit liest der Server aus Postgres.
- `sharp` (für `next/image`) und `postgres` sind `serverExternalPackages` und werden in `.next/standalone/node_modules` mitgeliefert – kein zusätzliches `npm install` im Runtime-Image.
- `NEXT_PUBLIC_SITE_URL` ist ein Build-Argument (`build.args` in Compose) – nach Änderung neu bauen.

---

## Option B – Vercel + Neon/Supabase Postgres

Auf Vercel ist das Dateisystem zur Laufzeit **schreibgeschützt**. Deshalb gilt:

- `DATABASE_URL` ist **Pflicht** – ohne Datenbank würde jeder Admin-Speichervorgang und jede Bestellung fehlschlagen. Der JSON-Fallback funktioniert nur lesend (Erstbefüllung aus `content/*.json`); `data/*.json` gibt es dort nicht.
- Bild-Uploads brauchen S3-kompatiblen Speicher (`S3_*` + `UPLOADS_PUBLIC_HOST`, siehe `docs/UPLOADS.md`); der lokale Treiber kann auf Vercel nicht schreiben.
- Alle anderen Variablen wie oben unter „Umgebungsvariablen“.

### Schritte

1. **Datenbank anlegen**
   - *Neon*: Projekt erstellen, „Pooled connection“-String kopieren (`…-pooler….neon.tech/…?sslmode=require`).
   - *Supabase*: Project Settings → Database → Connection string. Für Serverless den **Transaction-Pooler** (Port 6543) mit `?pgbouncer=true` verwenden – der Store deaktiviert Prepared Statements dann automatisch (sonst `DATABASE_PREPARE=false` setzen). `DATABASE_SSL=require` setzen, falls die URL kein `sslmode` enthält.
2. **Tabelle anlegen und seeden** (lokal, mit der Produktions-URL):
   ```bash
   DATABASE_URL="postgres://…" npm run db:migrate
   DATABASE_URL="postgres://…" npm run db:seed -- --only content
   ```
   (Optional – der Store legt Tabelle und Inhalte auch beim ersten Request an. Der explizite Seed vermeidet aber einen langsamen ersten Aufruf und stellt sicher, dass alle Dokumente vorhanden sind.)
3. **Vercel-Projekt** aus dem Repo anlegen (Framework: Next.js, Node 22). Environment Variables setzen: `DATABASE_URL`, `DATABASE_POOL_MAX=2`, `ADMIN_PASSWORD`, `ADMIN_SECRET`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, Mail-, Stripe- und `S3_*`-Variablen. Region möglichst nahe an der Datenbank wählen (z. B. `fra1`).
4. **Deploy**. Im Build wird `DATABASE_URL` bereits verwendet (Prerendering liest aus der Datenbank, fällt bei fehlenden Dokumenten auf `content/*.json` zurück). Ist die Datenbank beim Build nicht erreichbar, schlägt der Build fehl – dann Erreichbarkeit/IP-Allowlist prüfen.
5. **Cron**: `vercel.json` mit den beiden Cron-Einträgen aus `docs/MAIL.md` anlegen; Vercel sendet `Authorization: Bearer $CRON_SECRET` automatisch.
6. **Domain** in Vercel verbinden, `NEXT_PUBLIC_SITE_URL` anpassen und erneut deployen.

### Betrieb

- Inhalte werden ausschließlich über `/admin` (→ Datenbank) gepflegt. `content/*.json` im Repo ist nur noch der Seed für neue Umgebungen; um Repo-Änderungen zu übernehmen: `npm run db:seed -- --force --only content`.
- Backups über den Anbieter (Neon: Branches/PITR, Supabase: tägliche Backups) plus gelegentlich `pg_dump`.
- Logs: Vercel → Functions. Beim Kaltstart erscheint `[boquetterie] datastore: postgres`.
