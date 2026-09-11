# Sicherheit

Überblick über die Schutzmaßnahmen des Shops und die Checkliste vor dem Go-live.

## Admin-Authentifizierung

- Ein Passwort (`ADMIN_PASSWORD`) für den gesamten Admin-Bereich. Login unter `/admin/login`, Endpunkt `POST /api/admin/login`, Vergleich in konstanter Zeit.
- Erfolgreicher Login setzt das Cookie `bq_admin`: `<ablauf>.<HMAC-SHA256(ADMIN_SECRET, payload)>`, `httpOnly`, `sameSite=lax`, `secure` in Produktion, Laufzeit 12 h.
- `ADMIN_SECRET` signiert das Cookie (Fallback: `ADMIN_PASSWORD`). Änderung des Secrets loggt alle Sitzungen aus.
- `src/proxy.ts` prüft das Cookie für `/admin/*` und `/api/admin/*` (Web Crypto, Edge-fähig). Nicht angemeldete Aufrufe erhalten `401` (API) bzw. einen Redirect zur Login-Seite.
- Zusätzlich prüfen alle Server Actions (`requireAdmin()`) und die Upload-Routen (`isAdminAuthenticated()`) die Sitzung selbst – Server Functions sind per direktem POST erreichbar, der Proxy allein reicht nicht.
- Der Admin ist per `robots: noindex` markiert.

Was es (noch) nicht gibt: mehrere Benutzer, Rollen, 2FA, Login-Sperre nach Fehlversuchen. Für ein Team mit mehreren Personen ist ein Identity-Provider (z. B. Auth.js mit OAuth) der nächste Schritt.

## Rate-Limits

`src/lib/rate-limit.ts` – In-Memory-Sliding-Window pro IP (`x-forwarded-for` / `x-real-ip`) und Endpunkt. Überschreitung liefert `429` mit `Retry-After`. Gilt pro Node-Prozess; bei mehreren Instanzen den Store gegen Redis/Upstash tauschen (Signatur bleibt gleich).

| Endpunkt | Limit | Fenster |
| --- | --- | --- |
| `POST /api/newsletter` | 5 | 10 min |
| `POST /api/contact` | 5 | 10 min |
| `POST /api/subscription-request` | 5 | 10 min |
| `POST /api/orders/lookup` | 20 | 10 min |
| `POST /api/coupons/validate` | 30 | 10 min |
| `GET /api/delivery/check` | 60 | 1 min |
| `GET /api/search` | 120 | 1 min |
| `GET /api/products` | 120 | 1 min |
| `GET /api/extras` | 120 | 1 min |
| `POST /api/admin/upload` | 60 | 10 min |
| `GET/DELETE /api/admin/uploads` | 120 | 1 min |

`POST /api/orders` (Bestellung anlegen) hat ein eigenes Limit in seiner Route.

Damit die IP-Erkennung hinter einem Reverse-Proxy (nginx, Traefik, Cloudflare) funktioniert, muss dieser `X-Forwarded-For` setzen – sonst teilen sich alle Besucher:innen einen Bucket.

## Spam-Schutz (Honeypot)

Kontakt- und Newsletter-Formular enthalten ein unsichtbares Feld `website` (außerhalb des Viewports, `tabIndex=-1`, `aria-hidden`). Ist es beim Absenden gefüllt, antwortet der Server mit `ok: true`, speichert aber nichts. Zusätzlich werden E-Mail-Adressen serverseitig validiert und Eingaben in der Länge begrenzt.

## Uploads

Siehe `docs/UPLOADS.md`. Kurz: nur für Admins, Format wird an den Bytes erkannt (nicht am MIME-Type), jede Datei wird durch `sharp` neu kodiert (kein SVG, kein eingebettetes Skript, keine EXIF/GPS-Daten), Dateinamen werden generiert, Löschen akzeptiert nur Schlüssel im festen Muster `jjjj/mm/name-hash.(jpg|png)` (kein Path-Traversal).

## Security-Header (`next.config.ts`)

Für alle Antworten gesetzt:

| Header | Wert |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` |

`poweredByHeader` ist deaktiviert. Eine Content-Security-Policy ist noch nicht gesetzt (Stripe/next/image benötigen eine sorgfältige Allowlist) – siehe Checkliste.

## Daten auf der Festplatte

- `content/*.json` – redaktionelle Inhalte (Git).
- `data/*.json` – Bestellungen, Newsletter, Kontakt- und Abo-Anfragen (personenbezogene Daten, nicht in Git).
- `public/uploads/` – Bilder (nicht in Git).

Alle Schreibvorgänge sind atomar (temporäre Datei + `rename`). Die Ordner `data/` und `public/uploads/` gehören auf ein persistentes Volume und ins Backup.

## Checkliste vor dem Go-live

1. **Secrets rotieren**: neues, langes `ADMIN_PASSWORD` und ein eigenes `ADMIN_SECRET` (`openssl rand -hex 32`) setzen. Niemals die Werte aus `.env.example` oder aus der Entwicklung übernehmen. Secrets nur über die Umgebung des Hosts, nicht in Git.
2. **HTTPS erzwingen**: TLS am Reverse-Proxy/Load-Balancer terminieren und HTTP auf HTTPS umleiten. Das Session-Cookie ist in Produktion `secure` und funktioniert ohne HTTPS nicht. HSTS ist bereits gesetzt – erst aktivieren, wenn HTTPS dauerhaft steht (die Direktive gilt zwei Jahre).
3. **Reverse-Proxy**: `X-Forwarded-For`/`X-Real-IP` durchreichen (Rate-Limits), Body-Limit auf mindestens 16 MB setzen (Uploads), Timeouts für `/api/admin/upload` großzügig wählen.
4. **Backups**: `data/`, `content/` und `public/uploads/` (bzw. den S3-Bucket) regelmäßig sichern und die Wiederherstellung einmal testen.
5. **Uploads persistent** machen (Volume oder S3), siehe `docs/UPLOADS.md`.
6. **Zahlungen**: Stripe-Live-Keys und Webhook-Secret setzen, Test-Keys entfernen.
7. **Umgebungsvariablen prüfen**: `NEXT_PUBLIC_SITE_URL` auf die echte Domain, keine Entwicklungsdefaults.
8. **Monitoring/Logs**: `429`-Häufungen und `5xx` beobachten; Fehler der Upload-Route landen im Server-Log (`[upload]`, `[uploads]`).
9. **Abhängigkeiten**: `npm audit` vor dem Deploy, regelmäßige Updates von `next`, `sharp`, `stripe`.
10. **CSP** (optional, empfohlen): `Content-Security-Policy` mit Allowlist für Stripe (`js.stripe.com`, `api.stripe.com`), Google Fonts (falls genutzt) und den Upload-Host ergänzen und im Report-Only-Modus testen.
11. **Rate-Limit-Store**: bei mehr als einer Instanz Redis/Upstash anbinden, sonst gelten die Limits pro Prozess.
12. **Admin-Zugang einschränken** (optional): `/admin` zusätzlich per IP-Allowlist, VPN oder Basic-Auth am Proxy schützen.
