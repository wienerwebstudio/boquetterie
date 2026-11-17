# Bild-Uploads (Medien)

Der Admin kann Bilder direkt hochladen – in jedem Bildfeld („Hochladen“ / „Aus Medien wählen“) und in der Medienbibliothek unter `/admin/medien`. Die gesamte Speicherlogik steckt in `src/lib/uploads.ts`; die API-Routen (`src/app/api/admin/upload`, `src/app/api/admin/uploads`) und die UI kennen den Speicherort nicht.

## Was beim Upload passiert

1. Der Browser schickt die Datei als `multipart/form-data` (Feld `file`) an `POST /api/admin/upload`.
2. Die Route prüft die Admin-Session (zusätzlich zum Proxy), das Rate-Limit (60 Uploads / 10 min) und die Größe (max. **15 MB**).
3. `sharp` liest die Datei und **erkennt das Format an den Bytes**, nicht am MIME-Type. Erlaubt: JPEG, PNG, WebP, AVIF. Alles andere wird mit `415` abgelehnt.
4. Das Bild wird automatisch gedreht (EXIF-Orientierung), auf **max. 2000 px** (längste Seite) verkleinert und neu kodiert:
   - PNG mit Transparenz → PNG
   - alles andere → progressives JPEG, Qualität 82
   Die Original-Bytes werden nie gespeichert; Metadaten (EXIF, GPS) fallen dabei weg.
5. Es wird **nur diese eine Datei** gespeichert. Responsive Varianten (WebP/AVIF, Breakpoints) erzeugt `next/image` beim Ausliefern.
6. Antwort: `{ ok, url, key, width, height, bytes }`. `url` ist der Wert, der in den Content-JSONs landet (z. B. `/uploads/2026/09/rosen-1a2b3c4d.jpg`).

Dateiname: `<jahr>/<monat>/<slug-des-originalnamens>-<8 Zeichen SHA-1>.<jpg|png>`. Der Hash macht Namen eindeutig und cache-sicher; derselbe Upload zweimal ergibt dieselbe Datei.

## Endpunkte

| Methode | Pfad | Zweck |
| --- | --- | --- |
| `POST` | `/api/admin/upload` | Datei hochladen (`file`) |
| `GET` | `/api/admin/uploads` | Alle Uploads, neueste zuerst (`{ key, url, bytes, modifiedAt }`) |
| `GET` | `/api/admin/uploads?source=static` | Bilder aus `public/images` (nur lesen – für den Medien-Dialog) |
| `DELETE` | `/api/admin/uploads?key=2026/09/….jpg` | Upload löschen |

Alle Routen liegen unter `/api/admin/*` und sind durch den Proxy (`src/proxy.ts`) und zusätzlich in der Route selbst durch `isAdminAuthenticated()` geschützt.

## Treiber

Der Treiber wird automatisch gewählt (`getUploadDriver()` in `src/lib/uploads.ts`):

1. Sind alle vier `S3_*`-Pflichtvariablen gesetzt → **S3** (unverändert, auch auf Netlify).
2. Sonst `UPLOADS_DRIVER=local` bzw. `UPLOADS_DRIVER=netlify`, falls gesetzt (zum Erzwingen, z. B. `netlify` unter `netlify dev`).
3. Sonst, wenn die App auf Netlify läuft → **Netlify Blobs**. Erkannt am Blobs-Kontext, den Netlify Functions mitgibt (`NETLIFY_BLOBS_CONTEXT` bzw. `globalThis.netlifyBlobsContext`), oder an `BUILD_ON_NETLIFY=1`, das `next.config.ts` beim Build einbettet (`NETLIFY=true` gibt es nur während des Builds).
4. Sonst → **lokales Dateisystem**.

| Variable | Pflicht | Bedeutung |
| --- | --- | --- |
| `UPLOADS_DRIVER` | nein | `local` oder `netlify` erzwingt den Treiber (S3 wird nur über `S3_*` gewählt). Leer = automatisch. |

### `netlify` (Netlify Blobs)

- Speicherort: site-weiter Blob-Store **`media`** (Paket `@netlify/blobs`); Netlify stellt Zugangsdaten automatisch bereit – keine Variablen nötig. Ansicht im Netlify-UI unter *Data & Storage → Blobs*.
- Schlüssel wie beim lokalen Treiber (`2026/11/rosen-1a2b3c4d.jpg`, Kundenfotos `reviews/2026/11/…`), Metadaten `{ contentType, bytes, uploadedAt }`.
- Auslieferung über die Route **`/media/<schlüssel>`** (`src/app/media/[...key]/route.ts`) mit richtigem `Content-Type` und `Cache-Control: public, max-age=31536000, immutable` (die Namen enthalten einen Inhalts-Hash). `next/image` lädt diese Pfade wie jedes lokale Bild (auf Netlify über das Image CDN); die CSP schränkt `img-src` nicht ein. Die Route liest auf Netlify immer aus dem Blob-Store – `/media`-Adressen bleiben also gültig, auch wenn später S3 dazukommt.
- Bestehende Adressen bleiben gültig: `/uploads/…` (lokal) und S3-URLs werden nicht umgeschrieben.
- Der Store ist für alle Deploys gemeinsam (Produktion und Previews sehen dieselben Dateien).

### `local` (Standard außerhalb von Netlify)

- Speicherort: `public/uploads/<jahr>/<monat>/…`
- Auslieferung: Next serviert `public/` statisch → `/uploads/…`. Achtung: `next start` kennt nur Dateien, die beim Start in `public/` lagen – neue Admin-Uploads erscheinen dort erst nach einem Neustart. Kundenfotos laufen deshalb über `/media/reviews/…` (liest direkt aus `public/uploads/reviews/`).
- `public/uploads/` ist in `.gitignore` (nur `.gitkeep` ist versioniert).

Geeignet für einen einzelnen Node-Server oder Docker-Container mit persistentem Volume.

### `s3` (S3-kompatibel)

Funktioniert mit AWS S3, Cloudflare R2, MinIO, Hetzner Object Storage, DigitalOcean Spaces usw.

| Variable | Pflicht | Bedeutung |
| --- | --- | --- |
| `S3_BUCKET` | ja | Bucket-Name |
| `S3_REGION` | ja | Region (bei R2/MinIO z. B. `auto` bzw. `us-east-1`) |
| `S3_ACCESS_KEY_ID` | ja | Zugangsschlüssel |
| `S3_SECRET_ACCESS_KEY` | ja | Geheimer Schlüssel |
| `S3_ENDPOINT` | nein | Eigener Endpunkt, z. B. `https://<account>.r2.cloudflarestorage.com` oder `http://minio:9000`. Wenn gesetzt, wird Path-Style-Adressierung verwendet. |
| `S3_PREFIX` | nein | Ordner im Bucket, Standard `uploads` |
| `S3_PUBLIC_URL` | nein | Öffentliche Basis-URL des Buckets/CDN, z. B. `https://cdn.example.at`. Ohne diese Variable wird `https://<UPLOADS_PUBLIC_HOST>` verwendet, danach der Endpunkt bzw. `https://<bucket>.s3.<region>.amazonaws.com`. |
| `UPLOADS_PUBLIC_HOST` | bei S3 ja | Hostname der öffentlichen Bild-URLs (ohne Protokoll), z. B. `cdn.example.at`. Wird in `next.config.ts` als `images.remotePatterns` eingetragen – **ohne diese Variable lehnt `next/image` die Bilder im Shop ab.** |

Der Bucket (bzw. das Prefix) muss öffentlich lesbar sein oder hinter einem CDN liegen; Objekte werden mit `Cache-Control: public, max-age=31536000, immutable` abgelegt.

Die vollständigen Objekt-Schlüssel lauten `<S3_PREFIX>/<jahr>/<monat>/<name>`; die Medienbibliothek listet nur Objekte, die diesem Muster entsprechen.

## Kundenfotos aus Bewertungen

`POST /api/reviews` (öffentlich, multipart) nimmt bis zu 3 Fotos pro Bewertung an – Ablauf und Einwilligung in `docs/MAIL.md` → „Fotos in Bewertungen“. Verarbeitung (`processReviewPhoto` / `storeReviewPhoto`):

- Rate-Limit zuerst (5 / Stunde pro IP), dann Felder, Einwilligung und Bestell-Token – erst danach werden Bilder dekodiert.
- Format an den Bytes erkannt: JPEG, PNG, WebP. HEIC (iPhone) kann das mitgelieferte `sharp` nicht lesen (die vorkompilierte libvips enthält nur den AVIF-Decoder der HEIF-Familie) → 415 mit Hinweis. iOS wandelt Fotos für das Formular (`accept="image/jpeg,image/png,image/webp"`) normalerweise selbst in JPEG um.
- Max. 10 MB pro Foto (vor dem Dekodieren geprüft), Anfrage gesamt max. 30,5 MB. Der Browser verkleinert vorher auf 1600 px, damit drei Fotos unter Netlifys Grenze von ca. 6 MB pro Anfrage bleiben.
- Automatisch gedreht (EXIF-Orientierung), alle Metadaten (EXIF, GPS) entfernt, max. 1600 px, JPEG Qualität 80 (Transparenz → weißer Hintergrund).
- Schlüssel `reviews/<jahr>/<monat>/<produkt-slug>-<hash>.jpg`, URL `/media/reviews/…` (lokal und Netlify) bzw. die S3-URL. Die Bestellnummer steht nicht im Namen.
- Kundenfotos erscheinen nicht in der Medienbibliothek. Verworfene Bewertungen und nicht freigegebene Fotos werden beim Übernehmen/Verwerfen gelöscht.

## Grenzen

| | Wert |
| --- | --- |
| Max. Upload-Größe | 15 MB |
| Max. Kantenlänge nach Verarbeitung | 2000 px |
| JPEG-Qualität | 82 (progressiv, mozjpeg) |
| Erlaubte Eingabeformate | JPEG, PNG, WebP, AVIF |
| Ausgabeformate | JPEG, PNG (nur bei Transparenz) |
| Rate-Limit Upload | 60 / 10 min pro IP |
| Rate-Limit Liste/Löschen | 120 / min pro IP |
| Kundenfotos | max. 3 pro Bewertung, je 10 MB, 1600 px, JPEG q80 |
| Rate-Limit `/media/…` | 600 / min pro IP |

## Docker / Persistenz

Mit dem lokalen Treiber liegen Uploads **im Container**. Ohne Volume sind sie nach dem nächsten Deploy weg. Deshalb:

```yaml
# docker-compose.yml (Auszug)
services:
  web:
    volumes:
      - uploads:/app/public/uploads
      - data:/app/data          # Bestellungen, Newsletter
volumes:
  uploads:
  data:
```

Hinweise:

- Bei `output: "standalone"` kopiert Next den Ordner `public/` **nicht** automatisch in den Standalone-Build. Das Dockerfile muss `public/` (und `.next/static`) in das Image kopieren; das Volume wird dann auf `/app/public/uploads` gemountet (Pfad ggf. an den `WORKDIR` anpassen).
- `sharp` benötigt native Binaries. Im Image `npm ci` auf derselben Plattform ausführen, auf der der Container läuft (z. B. `node:22-alpine` → `sharp` lädt die passende `linuxmusl`-Variante). `sharp` steht aktuell in den `devDependencies` – bei `npm ci --omit=dev` fehlt es zur Laufzeit; entweder als Dependency führen oder ohne `--omit=dev` installieren.
- Bei mehreren Instanzen (Load-Balancer, Serverless) den S3-Treiber verwenden, sonst sieht jede Instanz andere Dateien.
- Backups: Das Uploads-Volume gehört genauso gesichert wie `data/` und `content/`.

## Gelöschte Bilder

Löschen entfernt nur die Datei. Produkte oder Seiten, die den Pfad noch verwenden, zeigen dann ein leeres Bild – die Medienbibliothek warnt davor, prüft aber keine Referenzen.
