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
| P1 | Gutschein WILLKOMMEN10 und Newsletter ohne Grundlage | in Zyklus 2 deaktiviert; **von den Inhabern bestätigt, seit Zyklus 3 wieder aktiv** |
| P1 | Abgeschnittene Inhalte auf Handys (Hero, Produktkarte, Lieferseite) | behoben (Zyklus 2) |
| P1 | Unbekannte URLs lieferten 200 statt 404; leere Kategorien und Platzhalterseiten im Index | behoben (Zyklus 2) |
| P1 | Admin-Login ohne wirksames Limit, Standardpasswort in Produktion möglich | behoben (Zyklus 2) |
| P1 | Impressum, AGB, Datenschutz, Widerruf nur Platzhalter | **offen – braucht Firmendaten und geprüfte Rechtstexte**; Seiten sind `noindex` |
| P1 | Domain `bloomery.at` kollidiert mit EU-Marke „BLOOMERY“ | **offen – Entscheidung der Inhaber** (2.5) |
| P2 | Tastatur-/Screenreader-Mängel (Akkordeon, Dialog-Fokus, Laufband, Kontraste, Fokusringe) | behoben (Zyklus 2) |
| P1 | Kontakt-/Firmenformular auf Live-Seite ohne Zustellweg; Erinnerung und Login versprachen Mails, die nie kämen | behoben (Zyklus 3) – endgültig erst mit Datenbank + Resend |
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

### Zyklus 3 – Ehrliche Funktionen ohne Infrastruktur, Checkout (2026-11-15)
Anlass: Auf Netlify ist das Dateisystem zur Laufzeit schreibgeschützt und es ist weder Datenbank noch Mail-Anbieter eingerichtet. Kontakt- und Firmenanfragen endeten deshalb in einer Fehlermeldung, Erinnerungen und Login-Links wären nie angekommen.
- **Anfragen** (`src/lib/inquiries.ts`): gelten als zugestellt, wenn sie gespeichert **oder** gemailt wurden. Geht beides nicht, antwortet die API mit 503 und das Formular bietet einen E-Mail-Link mit dem bereits getippten Text an.
- **Anlass-Erinnerung und Kundenkonto** (`src/lib/capabilities.ts`): zeigen „in Kürze verfügbar“ statt eines Formulars, solange Speicher und Mailversand fehlen; die Erinnerungsseite ist dann `noindex`. Interner Hinweis „AUTH_SECRET fehlt“ nicht mehr öffentlich sichtbar.
- **Checkout:** schlanker Footer (nur Kontakt und Rechtliches), Zonenname entfernt, Vor-/Nachname und Straße/Hausnummer nebeneinander auf Handys, kein Toast mehr über dem Warenkorb-Drawer.
- **Laufband oben:** vier kurze Aussagen statt zwei abgeschnittener Sätze.
- **Tippflächen** unter 24 px vergrößert (Abschnittslinks, Brotkrumen, Footer).
- **Build:** Turbopack-Warnung beseitigt (Test-Overlay wird nicht mehr getract); Favicon von 66 KB auf 8,6 KB.
- Dokumentiert in `docs/DEPLOYMENT.md` („Was ohne Datenbank und Mail-Anbieter passiert“).
- **Gutschein WILLKOMMEN10 (10 % ab 40 €) und Newsletter wieder aktiv** – auf Wunsch der Inhaber. Die Newsletter-API antwortet ohne Datenspeicher mit 503 („Anmeldung in Kürze möglich“), statt Adressen zu verlieren.

### Zyklus 4 – Stripe (2026-11-15)
- **Integrationsplan** mit Stripes Planer (`stripe tools plan`, abgeschlossen): Payment Intents + Payment Element mit eigenem Checkout – entspricht der bestehenden Integration. Grundsätze laut Plan: Link und dynamische Zahlungsarten an.
- **SDKs aktualisiert:** `stripe` 23.1 (API-Version 2026-10-28.endive), `@stripe/stripe-js` 10.3, `@stripe/react-stripe-js` 7.1.
- **Kleinunternehmer:** Laut Inhabern keine Umsatzsteuer. „inkl. MwSt./USt.“ an neun Stellen ersetzt durch „Endpreis“ bzw. den Hinweis nach § 6 Abs. 1 Z 27 UStG (`src/lib/vat.ts`, Footer, Warenkorb, Checkout, Bestellseite, Mails). **Wortlaut vom Steuerberater bestätigen lassen.** Stripe Tax bleibt aus, bis die Umsatzgrenze überschritten wird (Anleitung in `docs/PAYMENTS.md`).
- **Payment Element** mit Österreich, Name und E-Mail vorbelegt (vorher riet Stripe das Land aus der IP und verlangte z. B. eine US-Postleitzahl).
- **Chargebacks:** `charge.dispute.created` schickt eine Admin-Mail mit Antwortfrist.
- `docs/PAYMENTS.md`: eingeschränkter Schlüssel (`rk_…`) mit Mindestrechten für Live, Webhook-Events, Stripe-Tax-Umstieg.

### Zyklus 5 – Impressum und Umzug auf blumora.at (2026-11-15)
- **Impressum** mit den Angaben der Inhaber (Betreiber, Anschrift, Kontakt, Online-Streitbeilegung, Urheberrecht, Haftung; Text von fairesRecht.at inkl. Quellenangabe). Die Seite ist jetzt indexierbar. Leere Felder (UID, Gewerbebehörde, Mitgliedschaften, Berufsbezeichnung) sind weggelassen – **Gewerbebehörde und WKO-Mitgliedschaft sind bei einem Gewerbe Pflicht und müssen nachgetragen werden.**
- Links in Admin-Texten (URLs, E-Mail, Telefon, `[Text](URL)`) werden klickbar (`InlineText` in `src/components/content/prose.tsx`).
- Kontaktdaten in den Einstellungen: office@blumora.at, Telefon, Firmensitz (Kontaktseite: „Kein Ladengeschäft“).
- **Domain:** HTTPS-Zertifikat für blumora.at durch die Inhaber in Netlify erneuert. `siteUrl` und `NEXT_PUBLIC_SITE_URL` auf https://blumora.at; bloomery.at leitet dauerhaft (308) auf blumora.at weiter, `/api/*` bleibt auf der alten Domain für Webhooks erreichbar.

### Zyklus 6 – Neon und Live-Betrieb (2026-11-16)
- **Datenbank:** Neon-Projekt `bitter-truth-13396825` (Region US-Ost/Ohio, von den Inhabern so bestätigt – liegt nahe an Netlifys Funktionsregion). `DATABASE_URL` (gepoolt) ist bei Netlify als Secret hinterlegt. Der Shop nutzt dafür den HTTP-Treiber `@neondatabase/serverless`.
- **Kurier:** RiderX-Live-API-Zugang ist bei RiderX angefragt. Bis dahin werden Fahrer manuell im Kundenportal bestellt; `RIDERX_AUTO_BOOK=false`, Live-Server und Abholadresse sind bei Netlify gesetzt.
- **Impressum:** Gewerbebehörde und WKO-Mitgliedschaft vorerst zurückgestellt (Inhaber).

### Zyklus 7 – Mailversand, Floristen-Auftrag, Admin-Anmeldung (2026-11-16)
- **Mail:** SMTP über das eigene Postfach office@blumora.at (`SMTP_*`, Passwort als Secret). Pro bezahlter Bestellung geht ein Auftragszettel ohne Preise und Kundendaten an `MAIL_FLORIST`. `MAIL_REDIRECT_TO` leitet bis zum Start alle Mails an eine Testadresse um. Im Admin gibt es „Test-Mails senden“ mit einer Beispielbestellung.
- **Deploy:** Turbopacks Build-Dateicache speicherte die Build-Umgebung samt `SMTP_PASS`; Netlifys Secret-Scan brach den Deploy ab. Der Cache ist jetzt aus (`turbopackFileSystemCacheForBuild: false`), der Scan bleibt aktiv und meldet 0 Treffer.
- **Admin-Anmeldung (Fehler live):** Auf Netlify sieht eine API-Route die interne Deploy-Adresse statt blumora.at. Die Weiterleitung nach dem Login zeigte deshalb auf eine fremde Adresse, die der Browser wegen `form-action 'self'` blockierte – nach „Anmelden“ passierte sichtbar nichts. Alle Weiterleitungen aus API-Routen (Admin-Login/-Logout, Kunden-Login/-Logout, Erinnerung bestätigen/abmelden) sind jetzt relativ (`redirectLocal`).
- **Anmeldeseite:** klare Meldungen für falsches Passwort (mit verbleibenden Versuchen), Sperre nach 5 Versuchen (mit Wartezeit statt Textseite), „Wird geprüft …“ beim Absenden, Hinweis nach 12 s ohne Antwort, Passwort-anzeigen-Schalter; Leerzeichen um ein eingefügtes Passwort werden ignoriert.

### Zyklus 8 – Mails mit Fotos, Floristen-Budget, Grußkarten „Kommt bald!“ (2026-11-16)
- **Mails:** Bestellbestätigung und Auftragszettel zeigen das Produktfoto (über den Bild-Dienst, ~25 KB). Der Auftragszettel nennt pro Strauß und Extra das Einkaufsbudget netto und die Summe; fehlt ein Wert, steht „nicht hinterlegt“ statt einer Schätzung.
- **Floristen-Budget:** Werte aus „Blumora_Preiskalkulation.xlsx“ (Spalte „Einkauf Dody (netto)“), 146 Größen + Teddy und Duftkerze; alle Verkaufspreise der Tabelle stimmen mit dem Shop überein. Love Deluxe und Blue Bouquet kosten inzwischen wie die Rosensträuße → Rosen-Budgets übernommen (Inhaber bestätigen lassen). Gespeichert in der Datenbank, nicht im (öffentlichen) Repository; Admin-Seite zum Pflegen und Importieren. Kundenansichten entfernen das Budget.
- **Grußkarten:** Schalter `greetingCard.enabled` (fehlt = aus). Produktseite, Warenkorb und Checkout zeigen „Kommt bald!“, der Server verwirft Kartentexte, Mails enthalten keine Karte. Alle Texte, die eine Karte versprachen, sind angepasst.
- **Inhalts-Migrationen:** Seit Neon werden Inhalte aus `/content` nur noch für fehlende Dokumente übernommen. `src/lib/content-migrations.ts` überträgt gezielte Textänderungen einmalig in die Datenbank (Admin-Änderungen bleiben unberührt).

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
| 2026-11-15 (Z2) | Live nach Deploy: 404 für unbekannte Kategorie/Anlass, `noindex` auf Impressum und leerer Kategorie, Sitemap 87 URLs, `POST /api/orders` → 503, CSP-Header | wie erwartet |
| 2026-11-15 (Z2) | Lighthouse mobil live (3 Seiten) | Perf 91 / 96 / 91, A11y / BP / SEO je 100 |
| 2026-11-15 (Z3) | `tsc`, `eslint`, Unit | grün, 172/172 |
| 2026-11-15 (Z3) | Playwright E2E + axe im CI-Modus | 29/29 |
| 2026-11-15 (Z3) | Checkout-Durchlauf lokal bei 390 px bis zum Zahlungsschritt (Mock), Fehlerzustände Schritt 1 und 4 | läuft durch, Screenshots gesichtet |
| 2026-11-15 (Z3) | Newsletter-API (Speichern, 503 ohne Speicher, Honeypot), Gutschein-Prüfung WILLKOMMEN10 (gilt ab 40 €) | Unit 175/175, lokal per API geprüft; E2E 29/29 |
| 2026-11-15 (Z4) | Echte Stripe-Testzahlung lokal (Testkarte 4242, Webhook über `stripe listen`): Bestellung bezahlt; Erstattung → `refunded`; Chargeback → Admin-Alarm; alle Webhooks 200 | bestanden |
| 2026-11-15 (Z4) | `tsc`, `eslint`, Unit 175/175, E2E 29/29 | grün |
| 2026-11-15 (Z3) | Formular-Rückfall per simuliertem 503, Erinnerungs-/Konto-Hinweis im Produktionsbuild | wie erwartet |
| 2026-11-16 (Z7) | Lokaler SMTP-Empfänger: Kunde, Admin und beide Floristen-Adressen erhalten ihre Mail | bestanden |
| 2026-11-16 (Z7) | Netlify-Deploy mit `SMTP_PASS` nach Abschalten des Turbopack-Caches: Secret-Scan 8.761 Dateien | 0 Treffer, live |
| 2026-11-16 (Z7) | Live: `POST /api/admin/login` mit falschem Passwort → Weiterleitung auf `…netlify.app` (Fehler nachgestellt) | behoben, siehe Zyklus 7 |
| 2026-11-16 (Z7) | `tsc`, `eslint`, Unit 194/194, `next build`, Playwright E2E + axe 30/30 | grün |
| 2026-11-16 (Z8) | `tsc`, `eslint`, Unit 205/205, `next build`, Playwright E2E + axe 30/30 | grün |
| 2026-11-16 (Z8) | Mail-Vorschau (Kunde, Floristik) gerendert, Fotos laden vom Live-Bild-Dienst | gesichtet |
| 2026-11-15 (Z2) | Sichtprüfung per Screenshot (Start, Produktseite, Lieferung, Über uns; 390–1440 px) | abgeschnittene Inhalte behoben |

Nicht ausgeführt: Tests mit echten Zahlungen, RiderX-Livebuchung, Mailversand über Resend (keine Zugangsdaten bei Netlify).

## 6. Messwerte vor/nach

| Messung | Vorher | Nachher |
| --- | --- | --- |
| Font-Dateien (Build) | über Google, je Schnitt | 3 lokale Dateien, 102 KB gesamt |
| CI-Erfolgsquote | 9/14 Läufe | Zyklus 1 und 2 beide grün |
| Favicon (`icon.png`) | 66 KB (512 px) | 8,6 KB (96 px) |
| Lighthouse mobil `/` | Perf 81, LCP 2,7 s, TBT 590 ms, 2 342 KiB | Perf **91**, LCP 3,1 s, TBT 100 ms, 2 300 KiB (davon 1 093 KiB Hero-Video, lädt nach `load`) |
| Lighthouse mobil `/blumen` | Perf 73, LCP 3,4 s, TBT 770 ms | Perf **96**, LCP 2,6 s, TBT 50 ms |
| Lighthouse mobil `/produkt/red-passion` | Perf 82, LCP 3,1 s, TBT 480 ms | Perf **91**, LCP 3,4 s, TBT 130 ms |
| Seiten mit horizontaler Überbreite (Scan) | 4 | 0 |
| Cookie-Sheet beim ersten Besuch (Handy) | verdeckt 50–83 % | erscheint nicht (kein Tracking konfiguriert) |

## 7. Offene technische Probleme

- Listing-Seiten und `/lieferung` werden je Anfrage gerendert (TTFB live 0,2–0,6 s); Umstellung auf Revalidierung offen, Nutzen begrenzt.
- Hero-Video (1,1 MB) lädt auch mobil – nach `load`, nicht bei „Daten sparen“/2G/3G. Kleinere Mobilfassung wäre sinnvoll (bräuchte neue Kodierung).
- Bestellspeicher im JSON-Store ist ein Dokument (Race); Postgres (`DATABASE_URL`) vor Go-live aktivieren.
- Newsletter ohne Double-Opt-in. Vor dem ersten Versand nachrüsten (Bestätigungsmail über Resend) – sonst ist die Einwilligung nach TKG/DSGVO schwer nachweisbar.
- Cormorant-Italic wird auf jeder Seite vorgeladen (P3).
- GitHub-Actions laufen noch auf Node 20 (`actions/checkout@v4` usw.).
- Lokaler Bildoptimierer kann hängen (2.8) – nur Test-/Selbsthosting-Thema.

## 8. Offene Geschäftsfragen (können nicht ohne Inhaber entschieden werden)

- ~~Marke/Domain~~ erledigt: Hauptdomain ist jetzt blumora.at (Zyklus 5). Österreichisches Register für „Blumora“ noch prüfen.
- **Impressum:** Gewerbebehörde, WKO-Mitgliedschaft, ggf. UID und Berufsbezeichnung nachtragen.
- (alt) **Marke/Domain:** „BLOOMERY“ ist als EU-Wortmarke eingetragen (u. a. Blumen, Online-Blumenhandel, Lieferung). Empfehlung: `blumora.at` in Netlify als Hauptdomain hinterlegen und `bloomery.at` nur weiterleiten oder aufgeben; vorher anwaltlich prüfen lassen (auch österreichisches Register für „Blumora“).
- Firmendaten, Impressum, AGB, Datenschutzerklärung, Widerrufsbelehrung – von einer Fachperson freigeben lassen.
- „inkl. MwSt.“ auf der Produktseite: Die Kalkulation rechnet ohne USt (Kleinunternehmer?).
- Same-Day und Liefertage Mo–Sa: vom Floristen bestätigen lassen; danach im Admin wieder einschaltbar.
- Vase, Übertopf und Trauerschleifen auf den Fotos: im Preis enthalten?
- Gibt es das Postfach `kontakt@bloomery.at`? Telefonnummer und Instagram-Konto?
- Stripe, Datenbank, Mail, RiderX-Live-Zugang und Webhook bei Netlify eintragen; danach Bestellsperre aufheben.
- Apple Pay / Google Pay im Footer nur zeigen, wenn bei Stripe tatsächlich aktiviert.

## 9. Nächste konkrete Schritte

1. CI und Live-Deploy von Zyklus 3 prüfen.
2. Sobald die Inhaber Datenbank (`DATABASE_URL`), Resend (`RESEND_API_KEY`, `MAIL_FROM`, `MAIL_ADMIN`) und `AUTH_SECRET` bei Netlify eintragen: Kontaktformular, Erinnerung und Konto live gegenprüfen.
3. Mega-Menü (Spalten, Bilder), Footer-Abstand unter der mobilen Kaufleiste, Tablet-Layout der Produktseite.
4. Listing-Seiten cachen; mobile Fassung des Hero-Videos.
5. Newsletter-Double-Opt-in umsetzen, sobald Resend eingerichtet ist (vor dem ersten Versand).
6. Rechtstexte und Firmendaten einpflegen, sobald geliefert (Abschnitt 8).
