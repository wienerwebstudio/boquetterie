# Sicherheit

Überblick über die Schutzmaßnahmen des Shops und die Checkliste vor dem Go-live.

## Admin-Authentifizierung

- Ein Passwort (`ADMIN_PASSWORD`) für den gesamten Admin-Bereich. Login unter `/admin/login`, Endpunkt `POST /api/admin/login`, Vergleich in konstanter Zeit, eine einheitliche Antwort für jede falsche Eingabe.
- **Standardpasswörter sperren den Admin, statt ihn zu öffnen.** In Produktion (`NODE_ENV=production`) lehnt `adminPasswordProblem()` in `src/lib/admin-auth.ts` ab: ein leeres Passwort, den Platzhalter `change-me` aus `.env.example` und andere bekannte Standardwerte (`admin`, `password`, `passwort`, `test1234`, … – ohne Rücksicht auf Groß-/Kleinschreibung und Sonderzeichen) sowie alles unter 10 Zeichen. Dann ist kein Login möglich, vorhandene Cookies werden nicht akzeptiert, und der Server schreibt einmalig `[admin] ADMIN_PASSWORD is …` ins Log. Die Login-Seite zeigt denselben Hinweis wie bei fehlendem Passwort. In Entwicklung und Tests gilt nur „nicht leer“.
- **Login-Sperre:** höchstens 5 Versuche pro IP in 10 Minuten (`admin-login`). Danach antwortet der Endpunkt mit `429` und `Retry-After` – auch auf das richtige Passwort. Ein erfolgreicher Login setzt den Zähler der IP zurück. Grenzen dieses Zählers: siehe „Rate-Limits“.
- Erfolgreicher Login setzt das Cookie `bl_admin`: `<ablauf>.<HMAC-SHA256(schlüssel, payload)>`, `httpOnly`, `sameSite=lax`, `secure` in Produktion, Laufzeit 12 h.
- Der Signaturschlüssel wird abgeleitet: `HMAC-SHA256("blumora-admin-session-key:v1", ADMIN_SECRET)`. Fehlt `ADMIN_SECRET`, tritt `ADMIN_PASSWORD` an seine Stelle – das Passwort selbst ist also nie der HMAC-Schlüssel. Das trennt die Schlüssel sauber, macht ein schwaches Passwort aber nicht stärker: wer ein Cookie abgreift, kann ohne `ADMIN_SECRET` weiterhin offline Passwörter durchprobieren. Deshalb in Produktion immer ein zufälliges `ADMIN_SECRET` setzen. Änderung von Secret oder Passwort loggt alle Sitzungen aus.
- Abmelden nur per `POST /api/admin/logout` (kein `GET`, damit kein fremder Link und kein `<img>` die Sitzung beenden kann).
- `src/proxy.ts` prüft das Cookie für `/admin/*` und `/api/admin/*` (Web Crypto, Edge-fähig). Nicht angemeldete Aufrufe erhalten `401` (API) bzw. einen Redirect zur Login-Seite.
- Zusätzlich prüfen alle Server Actions (`requireAdmin()`) und die Upload-Routen (`isAdminAuthenticated()`) die Sitzung selbst – Server Functions sind per direktem POST erreichbar, der Proxy allein reicht nicht.
- Der Admin ist per `robots: noindex` markiert.

Was es (noch) nicht gibt: mehrere Benutzer, Rollen, 2FA. Für ein Team mit mehreren Personen ist ein Identity-Provider (z. B. Auth.js mit OAuth) der nächste Schritt.

## Seitensperre vor dem Start (`SITE_PASSWORD`)

Ist `SITE_PASSWORD` gesetzt, fragt `src/proxy.ts` auf jeder Seite per HTTP Basic Auth nach diesem Passwort (Benutzername beliebig). Der Browser merkt es sich bis zum Schließen. Die Antwort trägt `X-Robots-Tag: noindex`, damit Suchmaschinen nichts aufnehmen. Offen bleiben nur `/api/webhooks/*` und `/api/cron/*`, die eigene Geheimnisse prüfen. Zum Start die Variable leeren und neu deployen. Unabhängig vom Hosting-Tarif, Logik in `src/lib/site-lock.ts`.

## Rate-Limits

`src/lib/rate-limit.ts` – Sliding-Window pro Client-IP und Endpunkt. Überschreitung liefert `429` mit `Retry-After`.

**Was der Zähler leistet und was nicht.** Die Zähler liegen im Arbeitsspeicher *eines* Prozesses. Auf einem einzelnen, dauerhaft laufenden Container (Docker) ist das ein echtes Limit. Auf Serverless-Plattformen (Netlify, Vercel) zählt jede Instanz für sich, und ein Kaltstart vergisst alles – dort bremst der Zähler nur nach bestem Bemühen: ein Angreifer, dessen Anfragen auf mehrere Instanzen verteilt werden, bekommt entsprechend mehr Versuche. Für eine harte Garantie (vor allem für `admin-login` und `orders-lookup`) braucht es einen gemeinsamen Speicher: Redis/Upstash (`INCR` + `EXPIRE`) oder eine Postgres-Tabelle, alternativ die Rate-Limit-Regeln der Plattform bzw. des CDN (Netlify Rate Limiting, Vercel WAF, Cloudflare). Im Code ist dafür nur die `buckets`-Map in `rateLimit()` zu ersetzen, die Signatur bleibt gleich.

**Client-IP** (`clientKey()`), in dieser Reihenfolge:

1. Ein Header, den die Plattform setzt und den Clients nicht überschreiben können: auf Netlify `x-nf-client-connection-ip` (wird beim Build auf Netlify automatisch aktiviert, `next.config.ts` → `BUILD_TRUSTED_IP_HEADER`), sonst der in `TRUSTED_IP_HEADER` genannte (z. B. `cf-connecting-ip` hinter Cloudflare). Außerhalb von Netlify wird der Netlify-Header bewusst ignoriert – dort könnte ihn jeder Client selbst mitschicken.
2. Der **letzte** Eintrag von `X-Forwarded-For` – den hängt der Proxy an, der direkt mit der App spricht. Alles links davon stammt vom Client. (Früher wurde der erste Eintrag verwendet; damit ließ sich das Limit mit einem frei gewählten Header umgehen.)
3. `X-Real-IP`, nur wenn es kein verwertbares `X-Forwarded-For` gibt (Caddy z. B. reicht ein vom Client gesendetes `X-Real-IP` unverändert durch).
4. Sonst ein gemeinsamer Bucket für alle.

IPv6-Adressen werden auf ihr /64-Präfix gekürzt (ein Anschluss verfügt über das ganze /64). Voraussetzung für 2 und 3 ist ein Reverse-Proxy, der `X-Forwarded-For` selbst setzt bzw. ergänzt (Caddy, nginx mit `$proxy_add_x_forwarded_for`, Vercel). Steht Node ohne Proxy direkt im Netz, kommen alle Header vom Client und das Limit ist umgehbar. Liegt ein weiterer Proxy/CDN davor, ist der letzte Eintrag dessen Adresse – dann `TRUSTED_IP_HEADER` setzen, sonst teilen sich alle Besucher:innen einen Bucket.

**Speicher.** Höchstens 10.000 Schlüssel. Ist die Grenze erreicht, werden zuerst abgelaufene Einträge entfernt, danach die am längsten nicht benutzten (bis auf 9.000). Die Map wird nie komplett geleert – wer gerade gesperrt ist, bleibt gesperrt.

| Endpunkt | Limit | Fenster |
| --- | --- | --- |
| `POST /api/admin/login` | 5 (Erfolg setzt zurück) | 10 min |
| `POST /api/orders/lookup` | 5 | 10 min |
| `GET /api/orders/[id]` | 30 | 10 min |
| `POST /api/newsletter` | 5 | 10 min |
| `POST /api/contact` | 5 | 10 min |
| `POST /api/subscription-request` | 5 | 10 min |
| `POST /api/business-inquiry` | 5 | 15 min |
| `POST /api/coupons/validate` | 30 | 10 min |
| `GET /api/delivery/check` | 60 | 1 min |
| `GET /api/search` | 120 | 1 min |
| `GET /api/products` | 120 | 1 min |
| `GET /api/extras` | 120 | 1 min |
| `POST /api/admin/upload` | 60 | 10 min |
| `GET/DELETE /api/admin/uploads` | 120 | 1 min |

`POST /api/orders` (Bestellung anlegen) hat ein eigenes Limit in seiner Route.

## Bestellungen abfragen

- `GET /api/orders/[id]?token=…` antwortet für „Bestellung unbekannt“ und „Token falsch“ mit derselben `404`-Antwort – der Endpunkt bestätigt nicht, dass es eine Bestellnummer gibt. Token-Vergleich in konstanter Zeit.
- `POST /api/orders/lookup` (Sendungsverfolgung: Bestellnummer + E-Mail) antwortet für „unbekannt“ und „E-Mail passt nicht“ identisch mit `404`; die E-Mail wird ohne Rücksicht auf Groß-/Kleinschreibung in konstanter Zeit verglichen. 5 Versuche pro IP in 10 Minuten.

## Spam-Schutz (Honeypot)

Kontakt-, Newsletter- und Firmenkunden-Formular enthalten ein unsichtbares Feld `website` (außerhalb des Viewports, `tabIndex=-1`, `aria-hidden`). Ist es beim Absenden gefüllt, antwortet der Server mit `ok: true`, speichert aber nichts. `POST /api/subscription-request` prüft dasselbe Feld serverseitig; das Abo-Formular (`src/components/home/subscription-planner.tsx`) sendet es noch nicht mit – bis das versteckte Feld dort ergänzt ist, greift der Schutz nur gegen Bots, die den Endpunkt direkt mit einem `website`-Feld beschicken. Zusätzlich werden E-Mail-Adressen serverseitig validiert und Eingaben in der Länge begrenzt.

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
| `Content-Security-Policy` | `frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'` |

`poweredByHeader` ist deaktiviert.

Die Content-Security-Policy enthält bewusst nur Direktiven, die nichts am Rendering ändern können: kein Einbetten in fremde Seiten, kein `<base>`-Hijacking, Formulare nur an die eigene Origin, keine Plugins. `form-action 'self'` genügt, weil jedes `<form>` an die eigene Origin sendet; PayPal und Stripe Checkout werden per Skript-Navigation erreicht, nicht per Formular. Sollte je ein Formular an eine fremde Domain senden (oder eine Formular-Antwort dorthin umleiten), muss die Domain hier ergänzt werden. Eine Allowlist für Skripte, Styles und Verbindungen (`script-src`, `connect-src`, …) fehlt weiterhin – siehe Checkliste.

Statische Dateien unter `/images/*` und `/videos/*` erhalten `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`. Kein `immutable`: die Dateinamen enthalten keinen Hash, eine ausgetauschte Datei gleichen Namens ist also spätestens nach einem Tag (plus Revalidierung) überall aktuell.

## Daten auf der Festplatte

- `content/*.json` – redaktionelle Inhalte (Git).
- `data/*.json` – Bestellungen, Newsletter, Kontakt-, Abo- und Firmenkunden-Anfragen (personenbezogene Daten, nicht in Git).
- `public/uploads/` – Bilder (nicht in Git).

Alle Routen schreiben über den Datenspeicher (`readData`/`writeData` in `src/lib/cms.ts`), auch Kontakt (`contact-messages`) und Abo-Anfragen (`subscription-requests`): ohne `DATABASE_URL` landen sie in `data/*.json`, mit `DATABASE_URL` in Postgres. Beide Routen benachrichtigen zusätzlich `MAIL_ADMIN` (falls gesetzt). Hinweis: die Admin-Seite „Abo-Anfragen“ liest noch direkt `data/subscription-requests.json` (`src/components/admin/subscription-requests.ts`) und zeigt mit Postgres deshalb keine neuen Anfragen, bis sie auf `readData` umgestellt ist.

Alle Schreibvorgänge sind atomar (temporäre Datei + `rename`). Die Ordner `data/` und `public/uploads/` gehören auf ein persistentes Volume und ins Backup.

## Checkliste vor dem Go-live

1. **Secrets rotieren**: neues, langes `ADMIN_PASSWORD` (mindestens 10 Zeichen, kein Standardwert – sonst bleibt der Admin in Produktion gesperrt) und ein eigenes `ADMIN_SECRET` (`openssl rand -hex 32`) setzen. Niemals die Werte aus `.env.example` oder aus der Entwicklung übernehmen. Secrets nur über die Umgebung des Hosts, nicht in Git.
2. **HTTPS erzwingen**: TLS am Reverse-Proxy/Load-Balancer terminieren und HTTP auf HTTPS umleiten. Das Session-Cookie ist in Produktion `secure` und funktioniert ohne HTTPS nicht. HSTS ist bereits gesetzt – erst aktivieren, wenn HTTPS dauerhaft steht (die Direktive gilt zwei Jahre).
3. **Reverse-Proxy**: muss `X-Forwarded-For` selbst setzen bzw. ergänzen (Rate-Limits, siehe oben); hinter einem zusätzlichen CDN `TRUSTED_IP_HEADER` setzen, Body-Limit auf mindestens 16 MB setzen (Uploads), Timeouts für `/api/admin/upload` großzügig wählen.
4. **Backups**: `data/`, `content/` und `public/uploads/` (bzw. den S3-Bucket) regelmäßig sichern und die Wiederherstellung einmal testen.
5. **Uploads persistent** machen (Volume oder S3), siehe `docs/UPLOADS.md`.
6. **Zahlungen**: Stripe-Live-Keys und Webhook-Secret setzen, Test-Keys entfernen.
7. **Umgebungsvariablen prüfen**: `NEXT_PUBLIC_SITE_URL` auf die echte Domain, keine Entwicklungsdefaults.
8. **Monitoring/Logs**: `429`-Häufungen und `5xx` beobachten; Fehler der Upload-Route landen im Server-Log (`[upload]`, `[uploads]`).
9. **Abhängigkeiten**: `npm audit` vor dem Deploy, regelmäßige Updates von `next`, `sharp`, `stripe`.
10. **CSP erweitern** (optional, empfohlen): die vorhandene `Content-Security-Policy` um `script-src`/`connect-src`/`frame-src` mit Allowlist für Stripe (`js.stripe.com`, `api.stripe.com`), Google Fonts (falls genutzt) und den Upload-Host ergänzen und im Report-Only-Modus testen.
11. **Rate-Limit-Store**: bei mehr als einer Instanz und auf Serverless-Plattformen Redis/Upstash anbinden oder die Limits der Plattform nutzen, sonst gelten die Limits nur pro Instanz (siehe „Rate-Limits“).
12. **Admin-Zugang einschränken** (optional): `/admin` zusätzlich per IP-Allowlist, VPN oder Basic-Auth am Proxy schützen.
