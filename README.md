# Boquetterie – Blumenversand Wien

Ein moderner, conversion-optimierter Webshop für einen Blumenlieferdienst in Wien und Umgebung.
Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Zustand · JSON-Content-Store mit Admin-Bereich.

## Schnellstart

```bash
npm install
cp .env.example .env.local   # ADMIN_PASSWORD & ADMIN_SECRET setzen
npm run dev                   # http://localhost:3000
npm run build && npm start    # Produktion
```

## Struktur

| Pfad | Inhalt |
| --- | --- |
| `content/*.json` | Alle redaktionell pflegbaren Inhalte: Produkte, Anlässe, Kategorien, Extras, Liefergebiete, Gutscheine, FAQs, Bewertungen, Abo, Einstellungen, Startseite, Seiten, Landingpages |
| `data/*.json` | Laufzeitdaten (Bestellungen, Newsletter, Kontaktanfragen) – nicht versioniert |
| `src/app` | Routen (Shop, Produkt, Checkout, Bestellstatus, Admin, Landingpages, Rechtliches) |
| `src/components` | `ui/` Designsystem · `layout/` Header/Footer · `home/`, `shop/`, `product/`, `cart/`, `checkout/`, `content/`, `admin/` |
| `src/lib` | `cms.ts` (einzige Dateizugriffs-Schicht), `delivery.ts` (Lieferlogik), `catalog.ts` (Filter/Suche), `pricing.ts`, `orders.ts`, `seo.tsx` |
| `src/store` | Zustand-Stores: Warenkorb (persistiert), UI, Favoriten, Lieferkontext |
| `public/images` | Markenbilder (Produkte, Anlässe, Extras, Editorial, Galerie, Hero) |

## Geschäftslogik

- **Lieferzonen** (`content/delivery-zones.json`): PLZ-Bereiche, Lieferpreis, Gratis-ab, Mindestbestellwert, Liefertage, Cut-off, Vorlauf, Same-Day + Same-Day-Cut-off, Zeitfenster. Die Engine in `src/lib/delivery.ts` entscheidet anhand von Uhrzeit (Europe/Vienna), PLZ, Produkt und Sperrtagen, welche Tage angeboten werden – nichts ist im Frontend hart codiert.
- **Preise** werden clientseitig aus Warenkorb-Snapshots angezeigt und serverseitig bei Bestellanlage aus dem Katalog neu berechnet.
- **Bestellstatus**: eingegangen → bezahlt → in Vorbereitung → wird gebunden → bereit → unterwegs → zugestellt (bzw. nicht zustellbar / storniert). Kund:innen sehen eine Statusseite über Bestellnummer + Token.
- **Zahlungen**: Provider-Abstraktion in `src/lib/payments.ts`. Aktuell ein `mock`-Provider (Testmodus). Stripe/PayPal/Klarna/EPS sind vorbereitet, aber nicht angebunden. Es werden nur in den Einstellungen aktivierte Methoden angezeigt.

## Administration

`/admin` (Passwortschutz über `ADMIN_PASSWORD`). Details in `docs/ADMIN.md`.

## Platzhalter

Firmendaten, Rechtstexte (Impressum, Datenschutz, AGB, Widerruf), Unternehmensgeschichte und echte Bewertungen sind als klar gekennzeichnete Platzhalter angelegt und müssen vor dem Launch ergänzt werden. Beispielbewertungen sind mit `demo: true` markiert und werden im Shop entsprechend gekennzeichnet.

## Bilder

Die Markenbilder wurden KI-gestützt in einem einheitlichen Editorial-Stil erzeugt (`scripts/fetch-images.mjs` dokumentiert den Import). Für den Launch sollten sie durch echte Produktfotos im selben Stil ersetzt oder ergänzt werden.
