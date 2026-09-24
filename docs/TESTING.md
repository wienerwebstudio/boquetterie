# Testing

Drei Suiten, drei Werkzeuge – alle Abhängigkeiten sind bereits in `package.json`:

| Suite | Werkzeug | Befehl | Dauer (lokal) |
| --- | --- | --- | --- |
| Unit | Vitest (`vitest.config.ts`) | `npm run test:unit` | < 2 s |
| E2E | Playwright, Chromium (`playwright.config.ts`, Projekt `e2e`) | `npm run test:e2e` | ≈ 1 min |
| Accessibility | Playwright + `@axe-core/playwright` (Projekte `a11y-desktop`, `a11y-mobile`) | `npm run test:a11y` | ≈ 1,5 min |

`npm test` führt Unit- und E2E-Suite hintereinander aus. `npx playwright test` ohne Projektfilter startet E2E **und** a11y (so läuft es in CI).

## Vorbereitung

```bash
npx playwright install chromium          # einmalig, Browser-Binary
cp .env.example .env.local               # ADMIN_PASSWORD setzen
```

Ohne `ADMIN_PASSWORD` schlägt der Admin-Login-Test fehl. Die Playwright-Konfiguration setzt für den von ihr gestarteten Server `ADMIN_PASSWORD=test1234` / `ADMIN_SECRET=devsecret-devsecret`, falls die Variablen nicht gesetzt sind – die Tests lesen dieselben Werte über `process.env`.

## Unit-Tests (`tests/unit/`)

Reine Domänenlogik aus `src/lib`, Node-Umgebung, kein DOM, keine Dateizugriffe. Der Alias `@/` ist in `vitest.config.ts` auf `src/` gemappt. Fixtures (`tests/unit/fixtures.ts`) laden die echten Inhalte aus `content/*.json`; alle Zeitpunkte werden über den `now`-Parameter fixiert (`at("2026-09-10", "10:00")`), nie über die Systemuhr.

| Datei | Abdeckung |
| --- | --- |
| `delivery.test.ts` | Same-Day vor/nach Cutoff, Fenster-Filter (+60 min), Tages-Cutoff schiebt auf übermorgen, Sonntag wird übersprungen, Sperrtage, NÖ-Zone nur Di/Do/Sa mit eigenem Cutoff, `sameDayCapable`/`deliverable`, `isSameDayPossibleNow`, `findZone` (Bereiche, Einzel-PLZ, ungültige Eingaben, inaktive Zonen), `quoteDelivery` (Gratis ab, Zeitfenster-Aufpreis, Mindestbestellwert), Datumshelfer inkl. `getLocalNow` mit fixem `Date` |
| `pricing.test.ts` | `computeTotals` mit/ohne Zone, Fenster-Aufpreis, Gratislieferung, `belowMinOrder`, Gutscheine (Prozent, Fix mit Deckelung, `free_shipping`, Mindestbestellwert, inaktiv/Gültigkeitsfenster), Rundung auf Cent |
| `catalog.test.ts` | `applyFilter` (Farbe, Anlass, Stil, Größe, Blumenart, Saison, Preis, Same-Day, Lager, Kategorie, Query, inaktive Produkte), `matchesCategory` (`alle`, `unter-40`, `bestseller`, `neu`, Slug/Tag-Regeln, Farb-Regel = alle Farben, Stil-Regel nur ohne `categorySlugs`), `sortProducts`, Suche (Synonym „mama“ → Produkte + Anlass Danke, Groß/Klein, Umlaute, Limit, Ranking), `scoreProduct`, Badges, Blumenfamilien |
| `order-payload.test.ts` | `isEmail`, `isPhone`, `isIsoDate`, Pflichtfelder und Längen für Empfänger/Besteller, Grußkarte, Lieferung, `cleanString` |
| `shop-filters.test.ts` | `parseShopParams` (Objekt und `URLSearchParams`, unbekannte Werte), `serializeShopParams`/`shopHref` Round-Trip, `toProductFilter` inkl. Preis-Presets und Fixfilter, Chips, Zähler, Toggle, Reset, `resultLabel`, `roughlyDeliverableOn` |

Stand: 94 Tests, alle grün.

## E2E-Tests (`tests/e2e/*.spec.ts`)

Chromium, Desktop-Viewport 1280×900 (der Filter-Sheet-Test setzt 390×844). `baseURL` ist `http://localhost:3000`; mit `PLAYWRIGHT_BASE_URL` lässt sich ein anderer Server angeben. Lokal wird ein bereits laufender Dev-Server wiederverwendet (`reuseExistingServer`), sonst startet Playwright `npm run dev`. In CI wird vorher gebaut und `npm run start` verwendet.

| Spec | Was geprüft wird |
| --- | --- |
| `home.spec.ts` | H1 der Startseite, PLZ-Check: `1040` → „Lieferung verfügbar“, `8010` → „Leider liefern wir an 8010 noch nicht.“ |
| `shop.spec.ts` | `/blumen?farbe=rosa` zeigt nur rosa Sträuße + Chip „Rosa“, Chip entfernen zeigt wieder alle, mobiles Filter-Sheet (390 px) öffnet und schließt |
| `search.spec.ts` | Such-Overlay öffnen, „mama“ liefert Blush und den Anlass Danke, Escape schließt |
| `product.spec.ts` | Produktseite Amour: Large wählen, PLZ 1040 prüfen, Datum im Kalender wählen, Nachricht eingeben, in den Warenkorb – Drawer zeigt Position, Preis und Badge |
| `checkout.spec.ts` (`@slow`) | Vollständiger Kauf über alle fünf Schritte mit Mock-Zahlung („Kreditkarte“ → „Jetzt kaufen“). Geprüft werden nur stabile Ergebnisse: URL `/bestellung/BQ-…?token=` und H1 „Danke …“. Ist statt der Mock-Auswahl ein Stripe-Element eingebunden, wird der Zahlungsschritt nicht weiter asserted (Annotation im Report). |
| `not-found.spec.ts` | `/produkt/nope` antwortet mit HTTP 404 und der 404-Ansicht |
| `admin.spec.ts` | `/admin` leitet auf `/admin/login?next=…`, falsches Passwort wird abgewiesen, Login mit `ADMIN_PASSWORD` landet auf „Übersicht“ |

Hilfsfunktionen in `tests/e2e/helpers.ts`: `dismissConsent` (Cookie-Hinweis „Nur notwendige“), `addAmourToCart`, `seedCart` (schreibt den Zustand des Zustand-Stores `bloomery-cart` vor der ersten Navigation).

`tests/e2e/global-teardown.ts` setzt `data/orders.json` nach jedem Lauf auf `[]` zurück (nur beim JSON-Store, nicht bei `DATABASE_URL`).

## Accessibility (`tests/e2e/a11y/pages.a11y.ts`)

Jede Seite wird zweimal gescannt (Desktop 1280 px, Mobil 390 px) mit den Regelsätzen `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `best-practice`. Der Test **schlägt fehl bei `serious`/`critical`**; `moderate`/`minor` landen als Annotationen und als JSON-Anhang im Report. `KNOWN_ISSUES` in der Spec erlaubt, Regionen mit bekannten, noch offenen Verstößen auszunehmen – aktuell ist die Liste leer, alle Seiten laufen ohne Ausnahme durch den Gate.

Gescannt: `/`, `/blumen`, `/produkt/amour`, `/warenkorb` (mit Artikel), `/checkout` (Schritt 1, mit Artikel), `/faq`, `/lieferung`, `/anlaesse/geburtstag`.

### Audit-Ergebnis (axe-core 4.13, Desktop + Mobil, Cookie-Hinweis akzeptiert)

| Seite | Regel | Impact | Fundstelle | Behoben? |
| --- | --- | --- | --- | --- |
| `/`, `/produkt/amour` | `aria-prohibited-attr` | serious | `StarRating`: `aria-label` auf `<span>` ohne Rolle | ja – `role="img"` (`src/components/ui/star-rating.tsx`) |
| `/blumen`, `/anlaesse/…`, `/produkt/…` | `color-contrast` | serious | Größenzeile „Small · Medium · Large“ in der Produktkarte (`text-ink-soft`, 3,3:1) | ja – `text-ink-muted` (`shop/product-card.tsx`) |
| `/blumen`, `/anlaesse/…` | `color-contrast` | serious | Hinweise in Filtergruppen („Sofort bestellbar“, PLZ-Hinweis) | ja (`shop/filter-groups.tsx`) |
| `/blumen` (mobil) | `heading-order` | moderate | H3-Produktnamen ohne H2 (Filter-H2 ist mobil ausgeblendet) | ja – sr-only H2 „Sträuße“ (`shop/product-results.tsx`) |
| `/produkt/amour` | `color-contrast` | serious | „inkl. MwSt.“, Größenbeschreibung, „Wird mit dem Strauß geliefert“, Zeichenzähler, „(optional)“, Streichpreis | ja (`product/configurator.tsx`) |
| `/produkt/amour` | `color-contrast` | serious | „Beispielbewertungen …“, „Beispiel“ | ja (`product/reviews.tsx`) |
| `/produkt/amour` (mobil) | `scrollable-region-focusable` | serious | Bild-Karussell ist scrollbar, aber nicht fokussierbar | ja – `role="region"` + `tabIndex=0` (`product/gallery.tsx`) |
| `/produkt/amour` | `color-contrast` | serious | Wochentage/Legende im Kalender | ja (`product/calendar.tsx`) |
| `/warenkorb` | `definition-list` / `dlitem` | serious | `<dl>` mit `div > div`-Wrapper für die Gesamtsumme | ja – Rahmenklassen direkt auf der Zeile (`cart/cart-summary.tsx`) |
| `/warenkorb` | `link-name` | serious | Bild-Link ohne Namen (Bild mit `alt=""`) | ja – `aria-hidden` + `tabIndex=-1`, Name-Link bleibt (`cart/cart-line.tsx`) |
| `/warenkorb` | `heading-order` | moderate | H3 direkt nach H1 | ja – sr-only H2 „Artikel im Warenkorb“ (`cart/cart-page.tsx`) |
| `/warenkorb` | `color-contrast` | serious | „Grußkarte inklusive …“, „Noch keine Extras“, „Kommt mit dem Strauß“, „wird im Checkout berechnet“, „inkl. MwSt.“, Trust-Zeile | ja (`cart/cart-surprise.tsx`, `cart-upsell.tsx`, `cart-summary.tsx`, `cart-drawer.tsx`, `cart-page.tsx`) |
| `/checkout` | `color-contrast` | serious | „(optional)“ und Feld-Hinweise der Inputs | ja (`ui/input.tsx`) |
| `/lieferung` | `color-contrast` | serious | `dt`-Beschriftungen der Zonenkarten, Preishinweis | ja (`app/(shop)/lieferung/page.tsx`) |
| `/faq` | `color-contrast` | serious | Zähler in der Themen-Navigation | ja (`app/(shop)/faq/page.tsx`) |
| Grußkarten-Vorschau, aktive Filter, Lade-Skelette | `aria-prohibited-attr` (präventiv) | serious | `aria-label` auf `<div>` ohne Rolle | ja – `role="group"` bzw. `role="status"` (`cart/greeting-card-preview.tsx`, `shop/active-filters.tsx`, `shop/product-grid.tsx`, `cart/cart-page.tsx`) |
| `/produkt/nope` | HTTP-Status | – | `notFound()` hinter `loading.tsx` lieferte 200 | ja – `app/(shop)/produkt/[slug]/layout.tsx` prüft das Produkt vor der Suspense-Grenze |
| alle Seiten | `color-contrast` | serious | Footer: „Sichere Zahlung · SSL-verschlüsselt“, ©-Zeile (`text-ink-soft`) | ja – über das Token `--color-ink-soft` (siehe unten) |
| `/` | `color-contrast` | serious | Geschenkfinder-Einstieg (Nummern 01–03), „So funktioniert es“ (01–04), Extras-Hinweis, Bewertungsdaten, „Beispielbewertungen …“, Newsletter-Hinweis | ja – über das Token `--color-ink-soft` (siehe unten) |
| `/` (mobil) | `scrollable-region-focusable` | serious | Bewertungs-Karussell `<ul>` scrollbar, nicht fokussierbar | ja – `tabIndex={0}` + `aria-label` auf der `<ul>` (`home/reviews.tsx`) |
| `/checkout` | `definition-list` | serious | `<p>` als direktes Kind von `<dl>` in der Bestellübersicht | ja – Hinweise als `<div><dt class="sr-only">…</dt><dd>…</dd></div>` (`checkout/order-summary.tsx`) |
| `/checkout` | `color-contrast` | serious | „Noch keine Nachricht“, „Datum folgt“, „Noch … bis zur Gratis-Lieferung“, „inkl. MwSt.“, mobil „Sicher bezahlen · SSL“ | ja – über das Token `--color-ink-soft` (siehe unten) |
| global | – | – | Ursache fast aller Kontrastfunde: `--color-ink-soft: #8b877f` erreicht auf Ivory nur ≈ 3,3:1 | ja – Token in `src/app/globals.css` auf `#6f6b64` (≈ 4,6:1 auf `#faf7f2`) angehoben; deckt Footer, Startseite, Checkout, Suche-Tipp und Platzhalter ab |

Stand nach dem Integrationsdurchgang: keine `serious`/`critical`-Verstöße auf allen acht Seiten × zwei Viewports, `KNOWN_ISSUES` ist leer.

## CI (`.github/workflows/ci.yml`)

- `verify` – `tsc --noEmit`, ESLint (`src` und `tests`), `next build`
- `unit` – `npm run test:unit`
- `e2e` – Chromium via `npx playwright install --with-deps chromium` (Browser-Cache), `next build`, `npx playwright test` (E2E + a11y) gegen `npm run start`; `ADMIN_PASSWORD`/`ADMIN_SECRET` sind Test-Werte, der Playwright-Report wird nur bei Fehlern als Artefakt hochgeladen.

## Tipps

- Einzelnen Test starten: `npx playwright test tests/e2e/checkout.spec.ts --project=e2e --headed`
- Report ansehen: `npx playwright show-report`
- Anderen Port nutzen: `PLAYWRIGHT_BASE_URL=http://localhost:3100 npm run test:e2e`
- Unit-Tests im Watch-Modus: `npx vitest`
