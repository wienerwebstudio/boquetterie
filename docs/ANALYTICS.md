# Analytics & Cookie-Consent

Wie Blumora Reichweite misst, ohne die Zustimmung der Besucher:innen zu umgehen.

## Consent-Modell

Die Zustimmung wird über ein diskretes Bottom-Sheet (`src/components/consent/consent-banner.tsx`) eingeholt.
Es gibt drei Kategorien:

| Kategorie   | Schlüssel   | Bedeutung                                                                 |
|-------------|-------------|---------------------------------------------------------------------------|
| Notwendig   | `necessary` | Immer aktiv: Warenkorb, Lieferprüfung, Sicherheit, die Consent-Wahl selbst |
| Statistik   | `analytics` | Reichweitenmessung (Plausible, GA4, Umami) und Heatmaps/Sitzungsaufzeichnung (Clarity) – lädt nur nach Zustimmung |
| Marketing   | `marketing` | Reserviert für Werbe-Tools; steuert in GA4 `ad_storage` & Co. und in Clarity `ad_Storage` |

Grundsätze (DSGVO / TKG § 165 Abs 3, keine Dark Patterns):

- Drei gleichwertige Buttons: **Alle akzeptieren**, **Nur notwendige**, **Einstellungen** – kein hervorgehobener „Akzeptieren“-Button.
- Das Sheet ist nicht modal: kein Overlay, Scrollen bleibt möglich, `Esc` schließt beim ersten Besuch nicht ohne Wahl.
  Wird es später über „Cookie-Einstellungen“ im Footer geöffnet, kann es wieder geschlossen werden (eine Wahl existiert bereits).
- Barrierefrei: `role="dialog"`, `aria-labelledby`/`aria-describedby`, Fokus wird in das Sheet gesetzt und danach zurückgegeben, Toggles sind `role="switch"`.
- Ohne Zustimmung wird **nichts** von Drittanbietern geladen – kein Script, kein Pixel, kein Cookie.

### Speicherung

Die Wahl wird als JSON in `localStorage["bl-consent"]` gespeichert und in ein Cookie `bl-consent` (Path=/, SameSite=Lax, 180 Tage, `Secure` bei HTTPS) gespiegelt,
damit Server-Komponenten sie später lesen könnten. Format (`src/types/consent.ts`):

```json
{ "necessary": true, "analytics": false, "marketing": false, "version": 2, "updatedAt": "2026-09-10T12:00:00.000Z" }
```

`version` wird erhöht, wenn Kategorien oder Tools sich ändern – ältere Entscheidungen werden dann erneut abgefragt.

### Store

`useConsent` (`src/components/consent/store.ts`, Zustand):

```ts
const { consent, open, acceptAll, acceptNecessary, save } = useConsent();
open();                       // öffnet das Sheet in der Einstellungs-Ansicht (Footer-Link)
hasAnalyticsConsent();        // imperativ, z. B. in Helfern
```

## Tools & Umgebungsvariablen

`src/components/analytics/analytics.tsx` lädt Tools ausschließlich, wenn `consent.analytics === true`.
Es können mehrere gleichzeitig konfiguriert sein; ohne Variablen passiert nichts.

Ist **kein** Tool konfiguriert, öffnet sich das Consent-Sheet beim ersten Besuch nicht (`src/components/consent/config.ts`): Der Shop setzt dann nur technisch notwendigen Speicher, für den keine Einwilligung nötig ist. Über „Cookie-Einstellungen“ im Footer bleibt es erreichbar. Sobald eine der Variablen gesetzt ist, erscheint es wieder automatisch.

| Variable                          | Beispiel                         | Wirkung                                                              |
|-----------------------------------|----------------------------------|----------------------------------------------------------------------|
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`    | `blumora.at`                 | Lädt Plausible (`data-domain`). Cookielos, Pageviews inkl. SPA-Navigation automatisch. |
| `NEXT_PUBLIC_PLAUSIBLE_API`       | `https://blumora.at/api/event` | Optional: `data-api`, wenn Events über einen eigenen Proxy laufen. |
| `NEXT_PUBLIC_PLAUSIBLE_SRC`       | `https://blumora.at/js/script.js` | Optional: alternative Script-URL (Proxy / Self-Hosting). Standard: `https://plausible.io/js/script.js` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`   | `G-XXXXXXXXXX`                   | Lädt gtag.js mit Consent Mode: `default` = alles `denied`, danach `update` gemäß Wahl; `anonymize_ip: true`. |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID`    | `e425a6a0-…`                     | Lädt Umami (`data-website-id`). Cookielos, Pageviews inkl. SPA-Navigation automatisch. Account: Umami Cloud, Region EU. |
| `NEXT_PUBLIC_UMAMI_SRC`           | `https://stats.blumora.at/script.js` | Optional: alternative Script-URL (Self-Hosting). Standard: `https://cloud.umami.is/script.js` |
| `NEXT_PUBLIC_UMAMI_DOMAINS`       | `blumora.at`                     | Optional: `data-domains` – Umami zählt nur auf diesen Hosts, Deploy-Previews und localhost bleiben draußen. |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID`  | `zg4j5d4x6s`                     | Lädt Microsoft Clarity (Heatmaps, Sitzungsaufzeichnungen) und meldet die Wahl über die Consent API v2: Statistik → `analytics_Storage`, Marketing → `ad_Storage`. |

Diese Variablen gehören in `.env.local` (bzw. in die Umgebung des Hostings). Sie sind `NEXT_PUBLIC_*`, also im Client sichtbar – das ist beabsichtigt.

### Verhalten bei Widerruf

Schaltet jemand Statistik wieder aus:

- GA4: `ga-disable-<ID>` wird gesetzt, Consent Mode auf `denied` aktualisiert, das Script-Tag entfernt und die Cookies `_ga`, `_gid`, `_gat*`, `_ga_*` werden best-effort auf dem aktuellen Host und den übergeordneten Domains gelöscht.
- Plausible: Das Script-Tag und `window.plausible` werden entfernt (Plausible setzt ohnehin keine Cookies). Der History-Hook des bereits geladenen Scripts kann bis zum nächsten Seitenaufruf aktiv bleiben.
- Umami: Das geladene Script bleibt bis zum nächsten Seitenaufruf im Speicher, aber der `data-before-send`-Hook (`window.blUmamiBeforeSend`) prüft bei jedem Event die Zustimmung und verwirft es ohne sie. Umami setzt keine Cookies.
- Clarity: `clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "denied" })`, danach werden `_clck`, `_clsk`, `CLID` und `MUID` best-effort gelöscht.

## Events

Helfer: `track(event, props)` aus `src/components/analytics/track.ts`.
Er ist ein No-op ohne Statistik-Zustimmung und ohne geladenes Tool – gefahrlos in jeder Client-Komponente aufrufbar
(nicht in Server-Komponenten importieren).

```ts
import { events, track } from "@/components/analytics/track";

track(events.addToCart, { product_id: product.id, size: size.id, quantity: 1, value: 45.9 });
```

Event-Katalog (`events` in `track.ts`; die serverseitigen Namen stehen in `ServerEvent` in `src/lib/analytics-server.ts`). Props: snake_case, nur `string`/`number`/`boolean`, Beträge in EUR als Zahl (z. B. `45.9`),
`locale` = Shop-Sprache (`useI18n().locale`). **Keine personenbezogenen Daten**: keine Namen, E-Mails, Telefonnummern, Adressen,
Postleitzahlen, Freitexte oder Kartentexte.

Quelle: **Client** = `track()` im Browser (nur mit Statistik-Zustimmung) · **Checkout** = `track()` in `src/components/checkout/*` ·
**Server** = `src/lib/analytics-server.ts` (Umami-API, genau einmal pro Bestellung, nur wenn die Bestellung mit Zustimmung angelegt wurde; zusätzlich `locale`, `channel`).

### Produkte & Warenkorb

| Event | Bedeutung | Wo ausgelöst | Props |
|-------|-----------|--------------|-------|
| `view_item` | Produktseite angesehen | Client · `src/components/product/product-hero.tsx` (einmal pro Produkt-Mount) | `product_id`, `category`, `price` (vorausgewählte Größe; fehlt bei „Preis auf Anfrage“), `locale` |
| `select_variant` | Größe gewechselt | Client · `src/components/product/configurator.tsx` (nur bei Wechsel, nicht beim ersten Render) | `product_id`, `size`, `price` |
| `add_to_cart` | Strauß in den Warenkorb gelegt | Client · `configurator.tsx` nach `useCart().addItem()` | `product_id`, `size`, `quantity`, `value` (Zeile inkl. Extras) |
| `remove_from_cart` | Warenkorb-Zeile entfernt | Client · `src/components/cart/cart-line.tsx` („Entfernen“ oder Menge auf 0) | `product_id`, `value` (Zeile inkl. Extras) |
| `view_cart` | Warenkorb angesehen | Client · `cart-drawer.tsx` (bei jedem Öffnen) und `cart-page.tsx` (Mount), über `use-view-cart.ts` | `cart_value` (Zwischensumme), `item_count` |
| `add_extra` | Extra hinzugefügt | Client · `configurator.tsx`, `cart-upsell.tsx`, `cart-line.tsx` (Menge +) | `extra_id`, `value` (hinzugefügter Betrag) |
| `remove_extra` | Extra entfernt | Client · `configurator.tsx` (Menge auf 0), `cart-line.tsx` (X oder Menge auf 0) | `extra_id` |
| `product_search` | Suche mit Ergebnis | Client · `src/components/layout/search-overlay.tsx` (Live-Ergebnis) und `/suche` (`SearchResultsTracker`); nur Suchbegriffe ab 2 Zeichen, einmal pro Begriff und Tab, Begriff selbst wird nie gesendet (`search-tracking.tsx`) | `result_count` (Produkte + Anlässe + Kategorien), `locale` |
| `search_no_results` | Suche ohne Treffer | Client · wie `product_search`, zusätzlich bei `result_count = 0` | `locale` |
| `filter_used` | Shop-Filter gesetzt | Client · `src/components/shop/use-shop-params.ts` (Rail, Sheet, Sortierung); ein Event pro neu gewähltem Wert, Entfernen zählt nicht | `filter_type` (`anlass`, `blume`, `farbe`, `groesse`, `stil`, `saison`, `preis`, `verfuegbarkeit`, `datum`, `plz`, `sort`), `filter_value` (Id/Slug; bei `plz` nur `"set"`) |

### Checkout & Zahlung

| Event | Bedeutung | Wo ausgelöst | Props |
|-------|-----------|--------------|-------|
| `begin_checkout` | Checkout geöffnet | Checkout · `checkout.tsx` | `cart_value`, `item_count`, `locale` |
| `address_completed` | Adress-Schritt abgeschlossen | Checkout | `delivery_zone` |
| `address_validation_failed` | Adresse ungültig | Checkout | `error_code` |
| `delivery_slot_selected` | Liefertermin gewählt | Checkout | `slot_type`, `days_ahead` |
| `delivery_slot_unavailable` | Kein Termin verfügbar | Checkout | `delivery_zone` |
| `delivery_fee_shown` | Liefergebühr angezeigt | Checkout | `shipping_fee`, `cart_value`, `delivery_zone` |
| `express_selected` | Express-/Same-Day-Zustellung gewählt | Checkout | `delivery_zone`, `fee` |
| `coupon_applied` | Gutschein eingelöst | Checkout | `campaign_code`, `discount_value` |
| `coupon_invalid` | Gutschein ungültig | Checkout | `reason_code` |
| `payment_method_selected` | Zahlungsart gewählt | Checkout | `payment_method` |
| `payment_started` | Zahlung gestartet | Checkout | `payment_method`, `value` |
| `payment_failed` | Zahlung fehlgeschlagen | Checkout | `payment_method`, `safe_error_code` |
| `payment_cancelled` | Zahlung abgebrochen | Checkout | `payment_method` |

Die Checkout-Props sind der Stand von `src/components/checkout/checkout.tsx` – maßgeblich ist der Code.

### Bestellung (serverseitig)

| Event | Bedeutung | Wo ausgelöst | Props |
|-------|-----------|--------------|-------|
| `purchase` | Zahlung bestätigt | Server · `trackPurchase` (aus `markOrderPaid`) | `revenue`, `currency`, `payment_method`, `delivery_type`, `delivery_zone`, `item_count`, `order_type`, `coupon` |
| `refund` | Rückerstattung | Server · `trackRefund` | `refund_value`, `currency`, `reason_code`, `payment_method` |
| `order_delivered` | Als zugestellt markiert | Server · `trackDelivered` (Admin) | `delivery_type`, `on_time`, `delivery_zone` |
| `order_delayed` | Zustellung nach dem Zeitfenster | Server · `trackDelivered` (zusätzlich) | `delay_bucket`, `delivery_zone` |
| `order_cancelled` | Storniert | Server · `trackCancelled` (Admin) | `reason_code`, `payment_status` |

### Marketing & Sprachen

| Event | Bedeutung | Wo ausgelöst | Props |
|-------|-----------|--------------|-------|
| `language_changed` | Andere Sprache gewählt | Client · `src/components/layout/language-switcher.tsx` (nur bei anderer Sprache) und Link im `language-hint.tsx` | `from_locale`, `to_locale` |
| `language_suggested` | Sprachhinweis angezeigt | Client · `src/components/layout/language-hint.tsx` (einmal pro Seitenaufruf) | `suggested_locale` |
| `whatsapp_clicked` | WhatsApp-Link geklickt | Client · `src/components/analytics/click-tracking.tsx` (ein delegierter Klick-Listener in `site-shell.tsx`, Links zu `wa.me` / `api.whatsapp.com`) | `page_type` (`home`, `product`, `category`, `occasion`, `checkout`, `contact`, `faq`, `landing`, `other`), `locale` |
| `review_clicked` | Bewertungs-Link geklickt bzw. Bewertungsseite geöffnet | Client · `click-tracking.tsx` (Trustpilot, Google Maps / `g.page` / `search.google.com/local/writereview`); `/bewertung` (Link aus der Bewertungs-Mail) über `TrackOnMount` im Layout | `platform` (`trustpilot`, `google`, `blumora`) |
| `contact_submitted` | Kontaktanfrage gesendet | Client · `src/components/content/contact-form.tsx` und `/anfrage` (`custom-request-form.tsx`) nach `ok` | `topic` (Betreff-Id, z. B. `Bestellung`; bei `/anfrage` `custom_request`), `locale` |
| `gift_finder_started` | Geschenkfinder begonnen | Client · `src/components/giftfinder/gift-finder.tsx` (erste Antwort) | `locale` |
| `gift_finder_completed` | Geschenkfinder mit Ergebnis | Client · `gift-finder.tsx` nach Antwort der API | `occasion`, `budget_range`, `recipient`, `result_count` |
| `business_lead` | Firmenanfrage gesendet | Client · `src/app/[locale]/(shop)/firmenkunden/business-inquiry-form.tsx` nach `ok` | `service_type` |
| `reminder_created` | Erinnerung angelegt | Client · `src/components/reminders/reminder-form.tsx` nach `ok` | `occasion_type` (Anlass-Slug bzw. `eigener`, nie der Freitext) |
| `newsletter_signup` | Newsletter angemeldet | Client · `src/components/home/newsletter-form.tsx` nach `ok` | `locale` |
| `complaint_submitted` | Reklamation gesendet | **Noch nicht eingebaut** – es gibt noch kein Reklamationsformular (Name noch nicht in `events`) | – |
| `reorder_started` | Nachbestellung begonnen | **Noch nicht eingebaut** – es gibt noch keine „Nochmal bestellen“-Funktion (Name noch nicht in `events`) | – |

### Lieferung

| Event | Bedeutung | Wo ausgelöst | Props |
|-------|-----------|--------------|-------|
| `postcode_checked` | PLZ geprüft | Client · `src/hooks/use-delivery-check.ts` nach Antwort der API (Hero, Produktseite, Lieferseite, Warenkorb, Checkout); dieselbe PLZ wird pro Tab nur einmal gezählt | `delivery_zone` (Zonen-Id, `none` außerhalb), `available` |
| `outside_delivery_area` | PLZ außerhalb des Liefergebiets | Client · wie `postcode_checked`, zusätzlich bei `available = false` | `region_group` (`wien` = PLZ beginnt mit 1, `noe` = 2/3, sonst `other`; nie die PLZ) |

Reine Helfer (Seitentyp, Region, Zeilenwert, Filter-Änderungen) liegen in `src/components/analytics/event-props.ts`
(Tests: `tests/unit/analytics-event-props.test.ts`). Server-Komponenten importieren `track` nicht: Links erfasst
`click-tracking.tsx` per Delegation, Seitenaufrufe `TrackOnMount` (`src/components/analytics/track-on-mount.tsx`).

Neue Events: Name in `events` ergänzen (snake_case, stabil halten – die Namen landen in Dashboards; der Katalog ist abgestimmt, Änderungen nur gemeinsam), dann `track()` an der Stelle aufrufen, an der die Handlung tatsächlich abgeschlossen ist (nach `ok` der API, nicht beim Klick).
Keine personenbezogenen Daten in Props (keine E-Mails, Namen, PLZ).

Hinweis GA4: Für E-Commerce-Berichte erwartet GA4 bei `add_to_cart` ein `items`-Array. `track()` reicht Props 1:1 durch; wer die Standardberichte nutzen will, übergibt z. B.
`{ currency: "EUR", value: 44.9, items: [...] }` – Plausible ignoriert verschachtelte Werte.

## Umsatz & Kanal-Zuordnung (Revenue)

- **Kanal des Besuchs** (`src/lib/attribution.ts`, im Browser `src/components/analytics/visit.ts`): Aus Referrer und `utm_*` der Einstiegsseite wird ein grober Kanal (`chatgpt`, `google`, `google_ads`, `instagram`, `trustpilot`, `email`, `referral`, `direct` …). Ohne Zustimmung bleibt er nur im Speicher der aktuellen Seite; **mit** Statistik-Zustimmung wird er zusammen mit einer zufälligen **Besuchs-ID** in `localStorage["bl-visit"]` (30 Tage, letzter Nicht-Direkt-Kontakt gewinnt) gespeichert. Widerruf löscht `bl-visit`.
- **Bestellung**: Checkout und Angebots-Zahlung schicken `analytics: { attribution, visitorId? }` mit. Der Server prüft es (`sanitizeAttribution`, `sanitizeVisitorId`) und speichert `order.analytics` (Kanal, Referrer-Domain, utm, Einstiegsseite; Besuchs-ID + Browser nur mit Zustimmung). Das Dashboard `/admin/analytics` rechnet mit diesem Kanal – für **jede** Bestellung, auch ohne Zustimmung (keine Gerätespeicherung nötig, nur Daten des Bestell-Requests).
- **Umami-Sitzung**: Mit Zustimmung hängt der `before-send`-Hook die Besuchs-ID als Umamis `id` (distinct id) an jedes Event. Dadurch gehören alle Events des Besuchers zur selben Umami-Sitzung.
- **`purchase` serverseitig** (`src/lib/analytics-server.ts`): nach bestätigter Zahlung (`markOrderPaid`, Webhook oder Bestätigung) per `POST <Umami>/api/send` mit `revenue`, `currency: "EUR"`, `locale`, `channel`, `payment_method`, `delivery_type`, `delivery_zone`, `item_count`, `order_type`, `coupon` und derselben `id` → Umsatz landet beim richtigen Kanal und bei der richtigen Sprache. **Genau einmal**: atomarer Claim `claimOnce("analytics-<Bestellung>-purchaseSentAt")` (Postgres `insert … on conflict do nothing`, JSON-Datei exklusiv angelegt), zusätzlich Zeitstempel in `order.analytics.purchaseSentAt`. Ohne Besuchs-ID (keine Zustimmung) oder ohne `NEXT_PUBLIC_UMAMI_WEBSITE_ID` wird nichts gesendet.
- **`refund`** bei gemeldeter Erstattung (`markOrderRefunded`), **`order_delivered`/`order_delayed`** und **`order_cancelled`** bei Statuswechsel im Admin – jeweils ebenfalls genau einmal.
- Keine neuen Umgebungsvariablen: Endpunkt = Host von `NEXT_PUBLIC_UMAMI_SRC` (Standard `https://cloud.umami.is/api/send`), Hostname = erster Eintrag von `NEXT_PUBLIC_UMAMI_DOMAINS` (Standard `blumora.at`).
- Datenschutzerklärung: den Umami-Abschnitt um „pseudonyme Besuchs-ID (30 Tage im Browser), Zuordnung von Bestellumsatz und Kanal zur Besuchsstatistik, serverseitige Übermittlung des Bestellwerts an Umami – nur mit Einwilligung“ ergänzen.

## Page Views

- Plausible: automatisch, inkl. Client-Navigation (das Script hängt sich an `history.pushState`).
- GA4: Erster Pageview über `gtag("config")`, jede weitere Navigation sendet `Analytics` ein `page_view` mit `page_path`, `page_location`, `page_title`.
- Umami: automatisch, inkl. Client-Navigation.
- Clarity: zeichnet die Sitzung selbst auf. `track()` setzt zusätzlich `clarity("event", name)`, damit sich Aufnahmen nach Events filtern lassen (ohne Props).

Clarity maskiert Eingabefelder standardmäßig. Für den Checkout empfiehlt sich im Clarity-Dashboard unter Einstellungen → Maskierung der Modus **Streng**.

## Rechtlicher Hinweis

Die **Datenschutzerklärung** (`/datenschutz`, Inhalt in `content/pages.json`) muss die tatsächlich eingesetzten Tools nennen:

- Anbieter (Plausible Insights OÜ, Estland; Google Ireland Ltd.; Umami Software, Inc.; Microsoft Corporation), Zweck, Rechtsgrundlage (Art. 6 Abs 1 lit a DSGVO – Einwilligung), Speicherdauer der Cookies, Empfänger/Drittlandübermittlung (bei GA4: USA, Data Privacy Framework / Standardvertragsklauseln).
- Den Hinweis, dass die Einwilligung jederzeit über „Cookie-Einstellungen“ im Footer widerrufen werden kann.
- Die Cookie-Tabelle inkl. `bl-consent` (notwendig, 180 Tage) und – falls GA4 aktiv – `_ga`, `_ga_*` (Laufzeit laut Google), falls Clarity aktiv – `_clck`, `_clsk`, `MUID` (Laufzeit laut Microsoft).

Wird ein Tool hinzugefügt oder entfernt, sind Datenschutzerklärung **und** `CONSENT_VERSION` in `src/types/consent.ts` anzupassen.
