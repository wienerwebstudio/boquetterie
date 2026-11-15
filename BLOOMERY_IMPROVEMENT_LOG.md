# Improvement Log – Blumora (bloomery.at)

Fortlaufendes Arbeitsprotokoll des autonomen Verbesserungszyklus (Research → Audit → Design → Implement → Test → Measure → Review → Improve). Wer hier weiterarbeitet: zuerst Abschnitt 9 lesen.

Hinweise zur Lage:
- Marke ist **Blumora**, die Domain ist vorerst noch `bloomery.at` (`blumora.at` zeigt per DNS bereits auf Netlify, ist dort aber noch nicht als Domain hinterlegt – siehe 2.5 und Abschnitt 8). Dateiname wie beauftragt.
- Branch `claude/boquetterie-flower-shop-mooodl`; **jeder Push dorthin deployt bei Netlify live.** Deshalb nur geprüfte Stände pushen.
- Bestellen ist bewusst gesperrt (`NEXT_PUBLIC_ORDERS_PAUSED=true` bei Netlify), bis Zahlung, Datenbank und Mail eingerichtet sind.

## 1. Aktueller Projektzustand

- Next.js 16 (App Router), TypeScript, Tailwind v4, Zustand. Inhalte in `content/*.json`, Laufzeitdaten in `data/` bzw. Postgres. Architektur siehe `CLAUDE.md`.
- Sortiment: 53 Produkte des Partnerfloristen mit Preisen aus der Kalkulation, Lieferung 0 / 3,99 / 7,99 € je Bezirk, Zeitfenster 9–12 / 12–17 / 17–22.
- RiderX-Kurieranbindung fertig, aber nicht aktiviert (Zugangsdaten fehlen bei Netlify).
- Öffentlich erreichbar, Kasse gesperrt.

## 2. Audit-Ergebnisse

### 2.1 CI (2026-11-15)
- 5 von 14 CI-Läufen rot. Ursache A: `next/font/google` lädt beim Build von Google und scheitert sporadisch (`module-not-found` in der Manrope-CSS). Ursache B: a11y-Scan `/anlaesse/geburtstag` lief in das 90-s-Navigations-Timeout, weil `page.goto` auf `load` wartet und die Bildoptimierung auf dem 2-Kern-Runner bei kaltem Cache sehr langsam ist. Kein echter axe-Verstoß.

### 2.2 Inhalte / Wahrheitsgehalt (2026-11-15)
- Beispiel-Bewertungen mit Namen und „Verifizierter Kauf“-Optik in `content/reviews.json` (als `demo` markiert, aber öffentlich).
- Texte behaupteten eigenes Studio, eigene Florist:innen, eigene Zusteller, „stehend in Wasser“, „erst am Liefertag“, Verpackung „Seidenpapier, Leinenband, keine Folie“, Premium-Karte aus Baumwollpapier. Nichts davon ist belegt.
- Blumen-Abo mit erfundenen Plänen, Preisen, Stielzahlen und Rabatten öffentlich.
- Öffentlich sichtbarer Platzhalter-Block „Unsere Geschichte“ auf „Über uns“.

### 2.3 Code-Audit SEO / Sicherheit / A11y / Performance (2026-11-15, 33 Funde)
Die wichtigsten:
- **Wahrheit:** Studio-/Zusteller-/Verpackungsaussagen auch auf jeder Produktseite (`details.tsx`), in Landingpages, Kategorien, Anlässen, Mails, Firmenkunden. Same-Day wurde beworben, obwohl kein Produkt `sameDayCapable` ist (Seite `/blumen-heute-liefern` zeigte 0 Produkte). Erfundene Öffnungszeiten, Gutschein `WILLKOMMEN10` aktiv, Zahlungslogos trotz Mock-Zahlung.
- **Recht:** Impressum/AGB/Datenschutz/Widerruf nur Platzhalter, aber indexierbar und in der Sitemap; interne Platzhalter-Notizen öffentlich lesbar; Kontaktseite zeigte „[Telefonnummer – bitte ergänzen]“; Newsletter (Single-Opt-in) sammelte Daten ohne Datenschutzerklärung.
- **SEO:** Root-Layout setzte `canonical: "/"` für alle Seiten ohne eigenen Canonical; alle 53 Produkttitel endeten doppelt auf „| Blumora | Blumora“; `/blumen/<unbekannt>` und `/anlaesse/<unbekannt>` lieferten 200 statt 404; leere Kategorien (Bestseller, Neu) indexierbar und verlinkt; Sitemap mit `lastModified = jetzt` auf jeder URL; og:title überall der der Startseite; JSON-LD `Florist` (impliziert Ladengeschäft) und `InStock` trotz Bestellsperre.
- **Sicherheit:** Admin-Login ohne Rate-Limit; Limiter vertraut dem linken `X-Forwarded-For`; Bestell-Lookup unterscheidet 403/404; Kontakt- und Abo-Route schreiben am Store vorbei ins Dateisystem; kein CSP.
- **A11y:** eingeklappte Akkordeons bleiben fokussierbar; Ankündigungsleiste rotiert in `aria-live`; Formularfelder ohne sichtbaren Fokus und mit 1,25:1-Rahmen; einige Textfarben knapp unter 4,5:1; Suche/Drawer ohne Fokusfalle.
- **Performance:** Produktkarte war Client-Komponente (53 Produktobjekte wurden hydriert); LCP-Bild der Produktseite doppelt vorgeladen; Hero-Video (1,1 MB) startete sofort auf jedem Gerät; Stripe im Checkout statisch importiert; Listing-Seiten werden pro Aufruf gerendert.

### 2.4 Wettbewerbsrecherche (Blume2000, Fleurop, Bloom & Wild, Colvin, Flowerbx, Farmgirl, Bouqs, Venus et Fleur, MO Blumen Wien)
Übertragbare Prinzipien, nach erwarteter Wirkung:
1. „Kommt es an, wann, was kostet es“ direkt beim Preis beantworten (PLZ → frühester Termin + Liefergebühr auf der Produktseite).
2. Liefertage als antippbare Chips statt Kalender, frühester vorausgewählt.
3. Echte Bestellfrist in einer globalen Leiste (nur mit bestätigten Zeiten).
4. Größen als Preiskacheln mit greifbarem Maß und empfohlener Größe.
5. Bezirksgebühr vor dem Checkout zeigen; 0 € als Vorteil verkaufen. Wiener Mitbewerber MO Blumen verlangt 10/15 € und hat weder PLZ-Check noch Datumswahl noch Kartenfeld auf der Produktseite – Blumoras 0/3,99/7,99 € und die inkludierte Karte sind echte Vorteile.
6. Inkludierte Grußkarte vor dem Warenkorb sichtbar und beschreibbar.
7. Mobile Sticky-Leiste mit Preis, Datum, CTA.
8. Drei bis vier kuratierte Extras in der Kaufbox.
9. Ehrlicher Erwartungshinweis neben dem CTA („jeder Strauß ein Unikat“).
10. Hero: eine Zeile, ein CTA, konkrete Lieferfakten; kein Karussell.
11. Navigation nach Absicht (Anlässe, Preisgrenzen).
12. Gast-Checkout als Standard.

### 2.5 Markenrecht (Schnellprüfung, keine Rechtsberatung)
- **„BLOOMERY“ ist eine eingetragene EU-Wortmarke** (EUTM 017953364, Bloomery AB, Malmö; Klassen 31, 35, 39, 44: Blumen, Online-Blumenhandel, Blumenauslieferung, Floristen-Dienstleistungen; eingetragen 2019, läuft bis 2028, 2026 noch gepflegt). Gilt in Österreich. **Die Domain bloomery.at ist damit ein reales Risiko.**
- „Blumora“: keine Treffer im DPMA-Register (DE/EU/IR-EU) für Blumora/Blumoria; „BLOOMORA“ (EUTM 019076587) nur für Klassen 3/8/21. Nicht geprüft: österreichisches Register (see.ip), TMview, Firmenbuch.
- `blumora.at` zeigt bereits per DNS auf Netlify, ist dort aber noch nicht als Domain hinterlegt (kein Zertifikat). `blumora.com` steht zum Verkauf, `blumora.de` ist vergeben.

### 2.6 Lighthouse-Basis (mobil, Live-Seite, vor Zyklus 2)
| Seite | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS | Gewicht |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 81 | 100 | 100 | 100 | 1,2 s | 2,7 s | 590 ms | 0 | 2 342 KiB |
| `/blumen` | 73 | 100 | 100 | 100 | 1,2 s | 3,4 s | 770 ms | 0 | 930 KiB |
| `/produkt/red-passion` | 82 | 100 | 100 | 100 | 1,0 s | 3,1 s | 480 ms | 0 | 823 KiB |

### 2.7 Visuelle Prüfung (8 Viewports, Live-Seite vor Zyklus 2)
Wichtigste Funde: Hero-Textspalte auf Handys abgeschnitten (424 px breit bei 390 px Viewport), Preis in der 2-spaltigen Produktkarte aus der Karte gedrückt, Toolbar bei 320 px, PLZ-Karte auf `/lieferung` abgeschnitten, Newsletter-Feld kollabiert, „Über uns“ bricht bei 1024 px um, Karussells schnappen an den Rand, Cookie-Sheet verdeckt 50–83 % des Handy-Bildschirms, nur 2 Spalten auf Tablets, einzelne Datumsoption in 3-Spalten-Raster, Stockfotos (Floristin, Innenhof) auf Über uns/Lieferung. Alle in Zyklus 2 behoben (Abschnitt 4).

### 2.8 Lokaler Bildoptimierer (Fund beim Testen)
Nach vielen abgebrochenen Bildanfragen (schnelle Seitenwechsel bei kaltem Cache) kann `next start` eine einzelne `/_next/image`-Anfrage dauerhaft hängen lassen; das `load`-Ereignis der Seite kommt dann nie. Das erklärt die früheren CI-Timeouts im a11y-Lauf. Live nicht betroffen (dort liefert Netlifys Bild-CDN); in den Tests durch das begrenzte Warten in `gotoPage` abgefangen. Auf frischem Server nicht reproduzierbar.

## 3. Priorisierte Probleme

| Prio | Problem | Status |
| --- | --- | --- |
| P1 | CI instabil (Fonts, a11y-Timeout) | behoben (Zyklus 1), Ursache siehe 2.8 |
| P1 | Erfundene Bewertungen, falsche Studio-/Zustell-/Verpackungsaussagen, Abo mit erfundenen Preisen | behoben (Zyklus 1) |
| P1 | Same-Day-Versprechen ohne Bestätigung (Navigation, FAQ, Landingpage, Filter) | entfernt (Zyklus 2), `sameDayEnabled=false` |
| P1 | Gutschein WILLKOMMEN10 und Newsletter-Rabatt ohne Grundlage | deaktiviert (Zyklus 2) |
| P1 | Abgeschnittene Inhalte auf Handys (Hero, Produktkarte, Lieferseite) | behoben (Zyklus 2) |
| P1 | Unbekannte URLs lieferten 200 statt 404; leere Kategorien und Platzhalterseiten im Index | behoben (Zyklus 2) |
| P1 | Admin-Login ohne wirksames Limit, Standardpasswort in Produktion möglich | behoben (Zyklus 2) |
| P1 | Impressum, AGB, Datenschutz, Widerruf nur Platzhalter | **offen – braucht Firmendaten und geprüfte Rechtstexte**; Seiten sind `noindex` |
| P1 | Domain `bloomery.at` kollidiert mit EU-Marke „BLOOMERY“ | **offen – Entscheidung der Inhaber** (2.5) |
| P2 | Tastatur-/Screenreader-Mängel (Akkordeon, Dialog-Fokus, Laufband, Kontraste, Fokusringe) | behoben (Zyklus 2) |
| P2 | Listing-Seiten werden je Anfrage gerendert (`/blumen`, Kategorien, `/lieferung`) | offen |
| P2 | Bestellspeicher als ein Dokument (Race bei gleichzeitigen Bestellungen im JSON-Store) | offen – vor Go-live Postgres aktivieren |
| P3 | Newsletter ohne Double-Opt-in (derzeit abgeschaltet), Cormorant-Italic-Preload, Mega-Menü-Spalten | offen |

## 4. Implementierte Verbesserungen

### Zyklus 1 – Stabilität und Wahrheit (2026-11-15)
- **Schriften selbst gehostet** (`src/fonts/`, Manrope + Cormorant Garamond als Variable Fonts, SIL OFL): kein Google-Abruf mehr beim Build oder im Browser.
- **`gotoPage` in den Tests** wartet auf `domcontentloaded` und gibt `load` höchstens 20 s.
- **Bewertungen geleert**, **Abo ausgeblendet**, **Texte korrigiert** (Startseite, Über uns, Lieferseite, FAQ).

### Zyklus 2 – Audit-Ergebnisse (2026-11-15)
**Startseite**
- Hero zeigt drei belegte Fakten (Sträuße ab dem tatsächlich niedrigsten Preis, Lieferung in ganz Wien, Grußkarte inklusive) und die PLZ-Prüfung; Textspalte auf Handys nicht mehr abgeschnitten.
- Reihenfolge: Hero → Vorteile → Sortiment → Anlässe (eine kompakte Reihe) → Geschenkfinder → Kollektionen → Saison → Ablauf → Handwerk → FAQ. Galerie und Extras-Teaser entfernt (doppelten Inhalte), „So funktioniert es“ auf Handys als kompakte Liste.
- Hero-Video lädt erst nach dem `load`-Ereignis, nicht bei „Daten sparen“, 2G/3G oder reduzierter Bewegung.

**Shop und Produktseite**
- Produktkarte ist Server-Komponente (nur der Merken-Knopf ist Client-Code); Name und Preis untereinander im 2-Spalten-Raster; 3 Spalten ab Tablet.
- Zonennamen („Wien Zone 2“) werden Kund:innen nicht mehr gezeigt, stattdessen PLZ und Ort.
- Größenauswahl entfällt bei Produkten mit nur einer Größe; Badge „Beliebt“ heißt „Empfohlen“ (keine Verkaufszahlen vorhanden); Datumsauswahl füllt die Breite; widersprüchlicher Hinweis bei nicht belieferter PLZ entfernt.
- Pflanzen, Boxen und Kränze werden nicht mehr als „Strauß“ angesprochen.
- Stripe-Formular wird erst im Zahlungsschritt geladen.

**SEO**
- `pageMetadata()` (`src/lib/metadata.ts`): Titel, Beschreibung, Canonical und Open Graph je Seite aus einer Quelle; vorher erbten fast alle Seiten Canonical und OG der Startseite.
- Echte 404 für unbekannte Kategorien/Anlässe (Route-Layouts), `noindex` für leere Kategorien, gefilterte Listen und Platzhalterseiten; Sitemap enthält nur indexierbare URLs und kein erfundenes `lastModified`.
- Strukturierte Daten: `OnlineStore`; Angebote `OutOfStock`, solange Bestellen gesperrt ist.

**Wahrheit / Recht**
- Same-Day überall entfernt, Gutschein und Newsletter-Anmeldung abgeschaltet, Instagram-Link und Öffnungszeiten ohne Daten ausgeblendet, Zahlungslogos im Footer nur bei aktiver Kasse.
- Stockfotos (Floristin, Innenhof, Verpackung) durch Fotos aus dem Sortiment ersetzt.
- Cookie-Sheet erscheint nur noch, wenn ein einwilligungspflichtiges Tool konfiguriert ist (`src/components/consent/config.ts`); über den Footer bleibt es erreichbar.
- Navigation „Geschenksets“ heißt „Extras“ (es gibt nur Extras, keine Sets).

**Sicherheit** (Details `docs/SECURITY.md`)
- Rate-Limit vertraut nur dem Netlify-IP-Header, mit Größenbegrenzung; Admin-Login 5 Versuche / 10 min; Logout nur per POST.
- Produktion lehnt Standard- und zu kurze Admin-Passwörter ab; Signaturschlüssel wird abgeleitet (**alle Admin-Sitzungen wurden dadurch einmalig abgemeldet**).
- Bestellabfragen antworten einheitlich mit 404; Kontakt- und Firmenanfragen laufen über den Store, mit Honeypot und Admin-Mail.
- CSP ergänzt (`frame-ancestors`, `base-uri`, `form-action`, `object-src`), Cache-Header für Bilder und Videos.

**Barrierefreiheit**
- Fokusfalle, Escape und Fokus-Rückgabe für Warenkorb-Drawer und Suche (`src/lib/use-focus-trap.ts`); eingeklappte Akkordeon-Inhalte sind für Tastatur und Screenreader verborgen.
- Laufband oben pausiert bei Hover, Fokus und per Knopf; kein `aria-live` mehr.
- Sichtbare Fokusringe und kontrastreichere Feldrahmen (`line-strong`); Textfarben `ink-soft`, `moss`, `warn` auf ≥ 4,5:1 angehoben.
- Pfeiltasten in allen Radiogruppen (`src/lib/roving-radio.ts`).

## 5. Testergebnisse

Nur tatsächlich ausgeführte Läufe.

| Datum | Was | Ergebnis |
| --- | --- | --- |
| 2026-11-15 (Z1) | `tsc`, `eslint`, Unit, `next build`, Playwright lokal im CI-Modus | grün, 119 Unit-Tests, 29/29 E2E |
| 2026-11-15 (Z2) | `tsc --noEmit`, `eslint . --max-warnings=0` | grün |
| 2026-11-15 (Z2) | Unit (Vitest) | 171/171 (neu: Rate-Limit, Admin-Auth, Sicherheits-Routen) |
| 2026-11-15 (Z2) | `next build` (Produktionsinhalte) | grün, 104 statische Seiten; 1 bekannte Turbopack-Warnung (Abschnitt 7) |
| 2026-11-15 (Z2) | Playwright E2E + axe lokal im CI-Modus (Build mit Test-Katalog) | 29/29 |
| 2026-11-15 (Z2) | Overflow-Scan, 19 Seiten × 320/390/768 px | keine horizontale Überbreite |
| 2026-11-15 (Z2) | Sichtprüfung per Screenshot (Start, Produktseite, Lieferung, Über uns; 390–1440 px) | abgeschnittene Inhalte behoben |

Nicht ausgeführt: Tests mit echten Zahlungen, RiderX-Livebuchung, Mailversand über Resend (keine Zugangsdaten bei Netlify).

## 6. Messwerte vor/nach

| Messung | Vorher | Nachher |
| --- | --- | --- |
| Font-Dateien (Build) | über Google, je Schnitt | 3 lokale Dateien, 102 KB gesamt |
| CI-Erfolgsquote | 9/14 Läufe | wird beobachtet |
| Lighthouse mobil `/` | Perf 81, LCP 2,7 s, TBT 590 ms, 2 342 KiB | nach dem Deploy von Zyklus 2 zu messen |
| Lighthouse mobil `/blumen` | Perf 73, LCP 3,4 s, TBT 770 ms | nach dem Deploy zu messen |
| Lighthouse mobil `/produkt/red-passion` | Perf 82, LCP 3,1 s, TBT 480 ms | nach dem Deploy zu messen |
| Seiten mit horizontaler Überbreite (Scan) | 4 | 0 |
| Cookie-Sheet beim ersten Besuch (Handy) | verdeckt 50–83 % | erscheint nicht (kein Tracking konfiguriert) |

## 7. Offene technische Probleme

- Turbopack-Warnung: `CONTENT_OVERLAY_DIR` in `src/lib/store/json.ts` führt dazu, dass das ganze Projekt in die Server-Funktion getract wird (größeres Deploy).
- Listing-Seiten und `/lieferung` werden je Anfrage gerendert; Umstellung auf Revalidierung offen.
- Bestellspeicher im JSON-Store ist ein Dokument (Race); Postgres (`DATABASE_URL`) vor Go-live aktivieren.
- Newsletter ohne Double-Opt-in (abgeschaltet, bis es umgesetzt ist).
- Cormorant-Italic wird auf jeder Seite vorgeladen (P3).
- GitHub-Actions laufen noch auf Node 20 (`actions/checkout@v4` usw.).
- Lokaler Bildoptimierer kann hängen (2.8) – nur Test-/Selbsthosting-Thema.

## 8. Offene Geschäftsfragen (können nicht ohne Inhaber entschieden werden)

- **Marke/Domain:** „BLOOMERY“ ist als EU-Wortmarke eingetragen (u. a. Blumen, Online-Blumenhandel, Lieferung). Empfehlung: `blumora.at` in Netlify als Hauptdomain hinterlegen und `bloomery.at` nur weiterleiten oder aufgeben; vorher anwaltlich prüfen lassen (auch österreichisches Register für „Blumora“).
- Firmendaten, Impressum, AGB, Datenschutzerklärung, Widerrufsbelehrung – von einer Fachperson freigeben lassen.
- „inkl. MwSt.“ auf der Produktseite: Die Kalkulation rechnet ohne USt (Kleinunternehmer?).
- Same-Day und Liefertage Mo–Sa: vom Floristen bestätigen lassen; danach im Admin wieder einschaltbar.
- Vase, Übertopf und Trauerschleifen auf den Fotos: im Preis enthalten?
- Gibt es das Postfach `kontakt@bloomery.at`? Telefonnummer und Instagram-Konto?
- Stripe, Datenbank, Mail, RiderX-Live-Zugang und Webhook bei Netlify eintragen; danach Bestellsperre aufheben.
- Apple Pay / Google Pay im Footer nur zeigen, wenn bei Stripe tatsächlich aktiviert.

## 9. Nächste konkrete Schritte

1. CI und Live-Deploy von Zyklus 2 prüfen, Lighthouse nachmessen (Abschnitt 6 ergänzen).
2. Listing-Seiten cachen (Revalidierung), Turbopack-Warnung beseitigen.
3. Checkout-Durchlauf mit Mock-Zahlung auf 320–430 px sichten (Formulare, Fehlertexte, Zusammenfassung).
4. Mega-Menü, Footer-Abstand unter der mobilen Kaufleiste, Tap-Flächen < 44 px.
5. Newsletter-Double-Opt-in, falls der Newsletter wieder eingeschaltet werden soll.
