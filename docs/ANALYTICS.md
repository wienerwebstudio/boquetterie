# Analytics & Cookie-Consent

Wie Bloomery Reichweite misst, ohne die Zustimmung der Besucher:innen zu umgehen.

## Consent-Modell

Die Zustimmung wird über ein diskretes Bottom-Sheet (`src/components/consent/consent-banner.tsx`) eingeholt.
Es gibt drei Kategorien:

| Kategorie   | Schlüssel   | Bedeutung                                                                 |
|-------------|-------------|---------------------------------------------------------------------------|
| Notwendig   | `necessary` | Immer aktiv: Warenkorb, Lieferprüfung, Sicherheit, die Consent-Wahl selbst |
| Statistik   | `analytics` | Reichweitenmessung (Plausible und/oder GA4) – lädt nur nach Zustimmung    |
| Marketing   | `marketing` | Reserviert für Werbe-Tools; steuert in GA4 `ad_storage` & Co.             |

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
{ "necessary": true, "analytics": false, "marketing": false, "version": 1, "updatedAt": "2026-09-10T12:00:00.000Z" }
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
Es können beide gleichzeitig konfiguriert sein; ohne Variablen passiert nichts.

| Variable                          | Beispiel                         | Wirkung                                                              |
|-----------------------------------|----------------------------------|----------------------------------------------------------------------|
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`    | `bloomery.at`                 | Lädt Plausible (`data-domain`). Cookielos, Pageviews inkl. SPA-Navigation automatisch. |
| `NEXT_PUBLIC_PLAUSIBLE_API`       | `https://bloomery.at/api/event` | Optional: `data-api`, wenn Events über einen eigenen Proxy laufen. |
| `NEXT_PUBLIC_PLAUSIBLE_SRC`       | `https://bloomery.at/js/script.js` | Optional: alternative Script-URL (Proxy / Self-Hosting). Standard: `https://plausible.io/js/script.js` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`   | `G-XXXXXXXXXX`                   | Lädt gtag.js mit Consent Mode: `default` = alles `denied`, danach `update` gemäß Wahl; `anonymize_ip: true`. |

Diese Variablen gehören in `.env.local` (bzw. in die Umgebung des Hostings). Sie sind `NEXT_PUBLIC_*`, also im Client sichtbar – das ist beabsichtigt.

### Verhalten bei Widerruf

Schaltet jemand Statistik wieder aus:

- GA4: `ga-disable-<ID>` wird gesetzt, Consent Mode auf `denied` aktualisiert, das Script-Tag entfernt und die Cookies `_ga`, `_gid`, `_gat*`, `_ga_*` werden best-effort auf dem aktuellen Host und den übergeordneten Domains gelöscht.
- Plausible: Das Script-Tag und `window.plausible` werden entfernt (Plausible setzt ohnehin keine Cookies). Der History-Hook des bereits geladenen Scripts kann bis zum nächsten Seitenaufruf aktiv bleiben.

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

## Rechtlicher Hinweis

Die **Datenschutzerklärung** (`/datenschutz`, Inhalt in `content/pages.json`) muss die tatsächlich eingesetzten Tools nennen:

- Anbieter (Plausible Insights OÜ, Estland bzw. Google Ireland Ltd.), Zweck, Rechtsgrundlage (Art. 6 Abs 1 lit a DSGVO – Einwilligung), Speicherdauer der Cookies, Empfänger/Drittlandübermittlung (bei GA4: USA, Data Privacy Framework / Standardvertragsklauseln).
- Den Hinweis, dass die Einwilligung jederzeit über „Cookie-Einstellungen“ im Footer widerrufen werden kann.
- Die Cookie-Tabelle inkl. `bl-consent` (notwendig, 180 Tage) und – falls GA4 aktiv – `_ga`, `_ga_*` (Laufzeit laut Google).

Wird ein Tool hinzugefügt oder entfernt, sind Datenschutzerklärung **und** `CONSENT_VERSION` in `src/types/consent.ts` anzupassen.
