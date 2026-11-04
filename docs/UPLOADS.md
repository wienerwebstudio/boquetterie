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

Der Treiber wird beim Start automatisch gewählt: Sind alle vier `S3_*`-Pflichtvariablen gesetzt, wird S3 verwendet, sonst das lokale Dateisystem.

### `local` (Standard)

- Speicherort: `public/uploads/<jahr>/<monat>/…`
- Auslieferung: Next serviert `public/` statisch → `/uploads/…`
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
