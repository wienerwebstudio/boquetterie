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

track(events.addToCart, { product: product.slug, size: sizeId, value: unitPrice, currency: "EUR" });
```

Standard-Events (`events`):

| Name                    | Wo aufrufen                                                                                     | Props                                   |
|-------------------------|-------------------------------------------------------------------------------------------------|-----------------------------------------|
| `add_to_cart`           | In der Komponente, die `useCart().addItem()` aufruft (PDP-Kaufbox / Quick-Add). **Nicht** im Store selbst – der Store ist tool-agnostisch. | `product`, `size`, `quantity`, `value`, `currency` |
| `gift_finder_complete`  | Bereits eingebaut in `src/components/giftfinder/gift-finder.tsx`                               | `for`, `occasion`, `budget`, `results`  |
| `business_inquiry`      | Bereits eingebaut in `src/app/(shop)/firmenkunden/business-inquiry-form.tsx`                   | `need`                                  |
| `delivery_check`        | In `src/components/shop/postal-code-check.tsx` nach erfolgreicher Prüfung (noch nicht eingebaut) | `zone`, `sameDay`                       |
| `newsletter_signup`     | In `src/components/home/newsletter-form.tsx` nach `ok` (noch nicht eingebaut)                  | –                                       |

Neue Events: Name in `events` ergänzen (snake_case, stabil halten – die Namen landen in Dashboards), dann `track()` an der Stelle aufrufen, an der die Handlung tatsächlich abgeschlossen ist (nach `ok` der API, nicht beim Klick).
Keine personenbezogenen Daten in Props (keine E-Mails, Namen, PLZ).

Hinweis GA4: Für E-Commerce-Berichte erwartet GA4 bei `add_to_cart` ein `items`-Array. `track()` reicht Props 1:1 durch; wer die Standardberichte nutzen will, übergibt z. B.
`{ currency: "EUR", value: 44.9, items: [...] }` – Plausible ignoriert verschachtelte Werte.

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
