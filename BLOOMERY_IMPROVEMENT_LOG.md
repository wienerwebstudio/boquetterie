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

### Zyklus 9 – Stripe live vorbereitet (2026-11-16)
- **Inhaber-Setup (Browser-Assistent):** Live-Modus, Zahlungsmethoden Karten, Apple Pay, Google Pay, Amazon Pay, Link, EPS, Klarna; Domain blumora.at verifiziert; Webhook mit den vier Events (API 2026-10-28); eingeschränkter Schlüssel (PaymentIntents schreiben, Charges lesen). Kontoverifizierung bei Stripe noch offen.
- **Code-Abgleich:** nur `paymentIntents.create/retrieve` und Webhook-Signaturprüfung über den Raw Body – passt zum eingeschränkten Schlüssel. Einzige Ausnahme: das Blumen-Abo nutzt Checkout Sessions (derzeit aus).
- **Sicherheitslücke geschlossen:** Ohne Stripe-Schlüssel fiel ein Produktions-Build auf den Test-Anbieter zurück, der Bestellungen sofort als bezahlt markiert. Jetzt bietet er dann keine Zahlungsart an (`PAYMENTS_ALLOW_MOCK=true` nur für die E2E-Tests).

### Zyklus 10 – Rechtstexte und Widerrufsfunktion (2026-11-16)
- **AGB, Datenschutzerklärung, Widerrufsbelehrung** der Inhaber eingebaut (Stand 16.11.2026). Gegen den Shop geprüft: Liefertage Mo–Sa, drei Zeitfenster und 23 Bezirke stimmen. Platzhalter der Datenschutzerklärung mit belegbaren Angaben gefüllt (Stripe, Netlify und Neon mit DPF laut deren Datenschutzseiten, tatsächliche Cookies/Speicher, keine Analyse-Dienste, eigener Mailversand); ergänzt um Kundenkonto und Bewertungen. Migration ersetzt in der Datenbank nur Seiten, die noch Platzhalter sind.
- **Widerrufsfunktion „Vertrag widerrufen“** (`/vertrag-widerrufen`, `POST /api/withdrawals`): Name, E-Mail, Bestellnummer, optional Waren → „Widerruf bestätigen“; Eingangsbestätigung mit Datum/Uhrzeit per Mail und auf der Seite, Kopie an MAIL_ADMIN, Speicherung in `withdrawals`. Links im Footer, auf der Widerrufsseite und der Bestellseite.
- **Checkout:** Hinweis „kein Widerrufsrecht für Schnittblumen (§ 18 Abs. 1 Z 4 FAGG)“ und AGB-Verweis jetzt auch direkt beim Stripe-Button „Jetzt bezahlen“.

### Zyklus 11 – Floristen-Auftrag vereinfacht (2026-11-16)
- **Budget-Korrektur (Inhaber):** Der Floristik wird der Listenpreis „Einkauf Dody (Liste)“ als **Max. Budget** genannt (z. B. Red Rose Bouquet S 38,00 €); den 20 %-Nachlass rechnet Dody separat ab, er erscheint nirgends in der Mail. Startwerte neu verschlüsselt (gleicher Schlüssel).
- **Mail:** Größe als S/M/L/XL, „Max. Budget“ ohne „netto“, kurzer Hinweis „Bitte so binden wie auf dem Foto“, Extras mit Foto unter „Dazu“.

### Zyklus 12 – Test-Mail-Empfänger, Newsletter-Double-Opt-in (2026-11-16)
- **Admin:** Empfänger der „[Beispiel]“-Mails frei wählbar (nur diese Mails umgehen MAIL_REDIRECT_TO).
- **Newsletter:** Double-Opt-in mit Bestätigungsseite (Knopf statt Link), Abmeldeseite, Status im Admin, CSV nur bestätigte Adressen. Die Newsletter-Checkbox in der Kasse wurde bisher nirgends verarbeitet – sie startet jetzt die Bestätigung.
- **Live-Stand:** Bestellsperre wurde von den Inhabern aufgehoben; Stripe live.

### Zyklus 13 – Same-Day bis 19:00 (2026-11-16)
- **Inhaber-Entscheidung:** Same-Day in allen Wien-Zonen bis 18:30 Uhr (zuerst 19:00, auf Wunsch der Inhaber auf 18:30 vorgezogen), für alle Sträuße; Bestellungen für Folgetage ohne Bestellschluss (23:59). FAQ „Kann ich heute noch …“ entsprechend. Umgesetzt im Repo und per Inhalts-Migration in der Datenbank. (Dodys Website nennt keine Öffnungszeiten; Vorgabe der Inhaber übernommen.)
- Checkout-Übersicht zeigt nur lieferbare Daten (halb eingetippte Daten wie „0026-11-16“ erschienen dort als „Di., 16. Nov.“).
- Admin: Test-Mails einzeln wählbar (Alle, Partner, Kundenbestellung, Bestelleingang).

### Go-Live (2026-11-16)
- Erste echte Bestellung 18:05 Uhr: angelegt (201), per Stripe bezahlt, Bestätigung und Webhook je 200 (Netlify-Logs). Eine frühere Bestellung um 17:30 Uhr wurde nicht bezahlt.
- Dody bekam keine Mail, weil `MAIL_REDIRECT_TO` noch alle Mails an die Testadresse umleitete. Variable auf Wunsch der Inhaber gelöscht; ab dem nächsten Deploy gehen Auftrag, Kundenbestätigung und interne Mail an die echten Empfänger.
- Admin: unbezahlte Bestellungen zählen nicht mehr als „offen“ (Filter „Nicht bezahlt“, Warnhinweis auf der Detailseite).
- Admin: „Mails erneut senden“ auf der Bestellseite (nur bezahlte Bestellungen; Alle, Partner, Kund:in oder Bestelleingang; an die echten Empfänger, mit Rückfrage, Eintrag im Verlauf). Fehlt einer älteren Bestellung das Budget, wird es dabei aus der Budgetliste ergänzt.
- Optional „Selbst ausliefern“ an gewählten Wochentagen (Einstellungen → Zustellung): kein automatischer Fahrer, Hinweis in Admin, Partner- und interner Mail. Standard: nichts angekreuzt, also immer Fahrer.
- Rosensträuße (12 Produkte mit fester Rosenzahl): neue Größen XXL (61 Rosen, 175,90 €) und XXXL (99 Rosen, 250,90 €) laut Preiskalkulation; Rosenzahl je Größe als „Stiele“ hinterlegt und in der Partner-Mail angezeigt („XXL · 61 Stiele“), weil Dodys eigene Größen anders zählen. Budgets 170,41 € / 247,96 € verschlüsselt; gespeicherte Budgets werden um neue Größen aus den Startwerten ergänzt. DB-Migration `2026-11-17-rose-sizes-xxl-xxxl`. Größenauswahl bei 5+ Größen auf dem Handy zweispaltig.
- Regel der Inhaber: Auf dem Foto dürfen weniger Rosen sein als geliefert, nie mehr. Red Rose Bouquet hat jetzt ein Foto pro Größe (S 9, M 13, L 18, XL 32, XXL ~45–50 vorhandenes Foto, XXXL ~57 Rosen sichtbar; KI-Bilder mit Higgsfield, nachgezählt). Die Galerie zeigt zuerst das Foto der gewählten Größe („Größe Klein“), Bestellung und Partner-Mail verwenden es ebenfalls. DB-Migration `2026-11-17-red-rose-size-photos`.
- Feedback-Runde (17.11.): Login-Link wurde auf Netlify oft nicht verschickt (Mail ohne Warten auf das Ergebnis) – jetzt mit `after()`. Klarna und EPS über Stripe eingeschaltet (waren in den Shop-Einstellungen aus; Migration `2026-11-17-klarna-eps-via-stripe`). Same-Day-Zeitfenster nur noch, wenn mindestens 2 Stunden bis Fensterende bleiben (vorher 1 Stunde). Farbauswahl als Pflichtfeld für Tulpen und Adventskränze (Migration `2026-11-17-color-options`, im Admin pflegbar); Feld „Wünsche an unsere Florist:innen“ auf der Produktseite, getrennt vom Lieferhinweis – erscheint in Warenkorb, Bestellung, Admin, Kunden- und Partner-Mail.
- Feedback-Runde 2 (17.11.): Partner-Mail „fertig zur Abholung“ variabel (Fensterbeginn, bei laufendem Fenster jetzt + 60 min, auf Viertelstunde gerundet). Pflichtfelder im Checkout mit * markiert (waren schon Pflicht). Newsletter-Häkchen im Checkout trägt sofort ein (ohne Bestätigungsmail, Einwilligung mit Bestellnummer und Zeit dokumentiert). Bestellübersicht zeigt die Lieferadresse. Mobile Schrittanzeige anklickbar + „Zurück“. Zahlungsarten mit Marken-Logos (simple-icons, CC0), EPS heißt „Online-Überweisung (eps)“. Wien: stündliche Lieferfenster 9–22 Uhr (Migration `2026-11-17-hourly-windows`).
- Größen-Fotos für alle 12 Rosensträuße (S bis XXXL): 49 KI-Bilder (Higgsfield, Nano Banana 2.1) plus 14 vorhandene Fotos; jedes Bild nachgezählt, nie mehr Rosen als geliefert. Für Blaue Liebe M, Rot & Weiß Mix L und Rosenkuss XL vorerst das Foto der nächstkleineren Größe (KI traf die Zahl nicht). Migration `2026-11-17-rose-size-photos`. Verbrauch ca. 144 Credits.
- Galerie bleibt in der gewählten Größe: Bei Rosensträußen zeigt die Produktseite nur noch das Foto der gewählten Größe und eine daraus geschnittene Nahaufnahme (`ProductSize.detailImage`, `<foto>-nah.jpg`, im Admin pflegbar; Migration `2026-11-17-rose-size-closeups`). Wischen springt nicht mehr zu größeren Sträußen.
- Startseite (Feedback „mehr Blumen“, „wirkt wie Kleidung bestellen“): neues Startbild mit mehreren üppigen Sträußen statt einer Vase im leeren Raum (Higgsfield, 2 Bilder, ca. 4 Credits). Der alte Video-Loop zeigte den alten Strauß und entfällt (Migration `2026-11-17-hero-more-flowers`, nur wenn im Admin kein anderes Bild gewählt ist). Open-Graph-Bild ebenfalls neu.
- Adventskränze: Lila und Beige gerade und flach auf der Kommode neu erzeugt (vorher schräg von oben, ca. 4 Credits); Foto mit über die Kante hängendem Kranz und zwei schräge Doppelbilder entfernt (Migration `2026-11-17-advent-photos`).
- Mehr Farbe (Feedback „alles eintönig“): neue Farbfelder Blush, Peach, Salbei, Lavendel (`globals.css`, `src/lib/accents.ts`). Farbige Icon-Kreise in Trust-Leiste und „So funktioniert es“, Geschenk-Finder auf Peach, Kollektionen auf Salbei, Adventszeit als weinroter Block, Newsletter auf Blush, Eyebrows in Rosé. Kontraste per axe geprüft (E2E grün).
- Red Passion: zweites Foto je Größe als Wien-Straßenszene mit Bim statt Zoom (Klein bis Groß in der Hand, XL bis XXXL von einem Mann auf der Schulter getragen). `ProductSize.detailAlt` für die Bildbeschreibung. Rosen nachgezählt: S 8/9, M 12/15, L ca. 21/25, XL ca. 33/41, XXL ca. 37/61, XXXL ca. 50–60/99 (erster XXXL-Versuch mit ca. 100 Rosen verworfen). Ca. 18 Credits inkl. Muster. Migration `2026-11-17-red-passion-wien-photos`.
- Neue Regel der Inhaber: Auf dem Foto höchstens so viele Rosen wie geliefert und höchstens 4 weniger. Red-Passion-Wien-Fotos XL–XXXL lagen weit darunter; Nachversuche (genau mit Markierungen gezählt: XXL 39 bzw. 65, XXXL 73–77 bzw. 90) trafen den Bereich nicht – Generierung auf Wunsch gestoppt. Ergebnis: kein zweites Foto mehr bei XL–XXXL, keine gezoomte Nahaufnahme mehr als zweites Foto bei allen 12 Rosensträußen; nur Red Passion Klein–Groß behalten das Wien-Foto (Migration `2026-11-17-no-zoom-second-photos`). Offen: Hauptfotos Groß–XXXL der Rosensträuße liegen ebenfalls mehr als 4 Rosen unter der Liefermenge.
- SEO-Schnellmaßnahmen: H1 der Startseite ist jetzt „Blumenversand Wien“ (Markenzeile bleibt als große Überschrift), Search-Console-/Bing-Verifizierung per `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION`, Rosenstrauß-Texte „vier Größen“ → „sechs Größen“ (Migration `2026-11-17-rose-texts-six-sizes`). Stand: Sitemap mit 92 URLs, robots.txt ok, Canonical/Meta/Product- und FAQ-Schema vorhanden; in der Websuche noch keine Treffer für blumora.at (Search Console fehlt).

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
| 2026-11-16 (Z9) | Live vor Deploy: `/api/payments/methods` → Anbieter „mock“, Webhook → 404 „not configured“ (Stripe-Variablen erst nach letztem Deploy gesetzt) | Befund |
| 2026-11-16 (Z9) | `tsc`, `eslint`, Unit 208/208, `next build`, Playwright E2E + axe 30/30 | grün |
| 2026-11-16 (Z10) | `tsc`, `eslint`, Unit 215/215, `next build`, Playwright E2E + axe 38/38 (neu: Rechtsseiten, Widerrufsfunktion) | grün |
| 2026-11-16 (Z12) | `tsc`, `eslint`, Unit 221/221, `next build`, Playwright E2E + axe 40/40 (inkl. Newsletter-Seiten, Admin-Test-Mail-Feld) | grün |
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
- ~~Same-Day~~ erledigt: bis 18:30 Uhr laut Inhabern (Zyklus 13).
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
- Sonntagslieferung (Wunsch der Inhaber): Wien liefert Mo–So. Same-Day-Bestellschluss Mo–Sa 18:30, sonntags 17:45 (neues Feld `sameDayCutoffSunday`, im Admin pflegbar). FAQ und AGB §(3)/(4) an Sonntag und Stundenfenster angepasst (Migration `2026-11-17-sunday-delivery`). Favicon `/favicon.ico` ergänzt.
- SEO-Landingpages Welle 1: 38 neue Seiten (Feste/Termine, Für wen, Firmenkunden, Lieferung & Preis) mit eigenem Text, passenden Produkten, FAQ und Block „Weitere Anlässe & Themen“; Migration `2026-11-17-landing-pages-wave1` (nur fehlende Slugs). Alte Texte (drei Zeitfenster, Mo–Sa, vier Größen, „persönliche Nachricht“) korrigiert. Sitemap jetzt 130 URLs.
- Bewertungen: Anfrage im Admin manuell senden (auch beim Status „Zugestellt“ als Häkchen), automatischer Versand per Netlify Scheduled Functions täglich ab 1 Tag nach Zustellung (braucht `CRON_SECRET` in Netlify). Bewertungen mit bis zu 3 Fotos (EXIF entfernt, max. 1600 px), Speicher Netlify Blobs (`/media/…`), Freigabe pro Foto im Admin, Anzeige als Vorschaubilder auf Produkt- und Startseite. Einwilligung Pflicht. Ursache der fehlenden Mail: Cron war nie eingeplant, Regel war 2 Tage.
- Datenschutz: Abschnitt 13 heißt jetzt „Bewertungen und Kundenfotos“ (Bewertungsanfrage per E-Mail, bis zu 3 Fotos, Entfernen von Standort-/Kameradaten, Veröffentlichung nur nach Freigabe und mit Einwilligung, Widerruf, Speicher). Abschnitt 16 nennt Netlify Blobs. Von den Inhabern freigegeben; Migration `2026-11-17-privacy-review-photos`.
- Wien-Fotos (Strauß in der Hand, Straßenbahn dahinter) als zweites Bild für die übrigen 11 Rosensträuße, nur wo die gezählte Rosenzahl im Bereich der Größe liegt (S 5–9, M 11–15, L 21–25): erste Runde 17 Fotos (alle S, Farbensinfonie/Rosalie/Königin M, Rot & Weiß/Farbensinfonie/Rosalie L). Liste in `ROSE_WIEN_PHOTOS`, Migration `2026-11-17-rose-wien-photos` (überschreibt kein im Admin gewähltes zweites Bild).
- Wien-Fotos Runde 2 (Freigabe bis 50 Credits): M/L per Umfärben gezählter Vorlagen (11/13/22/23 Rosen) erzeugt, jedes Bild mit Punkt-Overlay gezählt. 15 weitere Fotos passen; jetzt haben alle 11 Sträuße S, M und L (Rosenkuss M im dritten Versuch, Migration `2026-11-17-rose-wien-photos-3`). Migration `2026-11-17-rose-wien-photos-2`. Verbraucht: 48 Credits.
- Neues Startbild (Wunsch der Inhaber): Frau mit großem Strauß auf Wiener Kopfsteinpflaster, Straßenbahn dahinter (GPT Image 2.6, 4K, nur Foto – kein Video wegen schwacher Handys). Desktop 4:5, Handy 4:3, OG-Bild 1200×630. Weitere Entwürfe verwendet: Kurier-Übergabe an der Altbautür (Startseite „Handwerk“), Strauß im Fenster mit Stephansdom („Über uns“ → „Wie wir arbeiten“), Kaffeehaus-Strauß (Firmenkunden). Migration `2026-11-17-hero-wien-tram`. E2E 40/40.
- Blumen-Menü (Desktop, Hover) kompakter: Kollektionen zweispaltig, kleinere Schrift und Abstände, Bild max. 220 px hoch – Höhe von ca. 670 auf ca. 260 px.
- **Partner-Floristiken (dringend, Wunsch der Inhaber):** Aufträge gehen nicht mehr automatisch an Blumen Dody (`MAIL_FLORIST`). Neu: Admin → *Partner* (Name, E-Mails, Telefon, Adresse, aktiv; Blumen Dody angelegt, nutzt ersatzweise `MAIL_FLORIST`). In jeder bezahlten Bestellung Karte „Partner“: zuordnen & Auftrag senden, erneut senden, wechseln (alter Partner bekommt Storno „von anderer Floristik übernommen“), Storno von Hand. Status *Storniert* schickt dem beauftragten Partner automatisch „STORNO … bitte nicht binden“; schlägt das fehl, steht „bitte sofort telefonisch absagen“ im Admin. Bestellliste mit Spalte „Partner“ („Kein Partner“ rot), interne Bestellmail mit „NOCH KEINEM PARTNER ZUGEORDNET“. Vorher bezahlte Bestellungen gelten als an Blumen Dody gesendet (`AUTO_PARTNER_UNTIL`). Lokal durchgeklickt (zuordnen → wechseln → stornieren, Altbestellung stornieren); Unit 316+, E2E 40/40. Offen: RiderX-Abholadresse je Partner, Floristen-Budget je Partner.
- Partner-Bestätigung: Auftragsmail mit Button „Auftrag bestätigen“ (Seite `/partner-auftrag`, Token pro Mail, Bestätigung erst per Klick – Mail-Scanner bestätigen nichts). Admin zeigt „Bestätigt“ bzw. „Noch nicht – ggf. anrufen“, Liste „bestätigt/nicht bestätigt“, Team bekommt eine Mail. Bestelleingang-Mail enthält jetzt den Partner-Teil (Fertig-Zeit, Max. Budget gesamt und je Position mit Foto). Lokal durchgeklickt; Unit 319.
- Bewertung Emre Ünsal: Datum 17.11. → 16.11.2026 (Wunsch der Inhaber), Migration `2026-11-18-review-date-emre`.
- Partner-Erinnerungen: Cron `partner-reminders` (Netlify, alle 10 Min.). 30 offene Minuten (Öffnungszeiten je Partner, Dody 07:30–19:30, Migration `2026-11-18-partner-dody-hours`) nach Auftrag/letzter Erinnerung → Partner bekommt den Auftrag als „Erinnerung n“, Team eine Mail mit Telefonnummer; max. 2, danach „bitte anrufen“. Lokal getestet (Erinnerung 1, 2, Ende; keine Doppelmails).
- **Zahlungen 18.11. (Klarna/Apple Pay „nicht durchgekommen“):** Netlify- und Stripe-Logs: 5 Bestellversuche, nur PaymentIntents angelegt, nie ein Bezahlversuch. Live-Test (2 unbezahlte Testbestellungen): Zahlungsfeld ohne Klarna. **Korrektur:** Klarna ist laut Stripe-Dashboard aktiv (Domain registriert, Käufe 17.11. und 18.11. 00:49 erfolgreich); der Test lief von einer US-IP, und Stripe zeigt Klarna nur Käufer:innen aus unterstützten Ländern – der Test sagt also nichts über Klarna in Österreich. Warum die Kundin nicht bezahlt hat, ist offen: Es gab keinen einzigen Bezahlversuch bei Stripe. Behoben/abgesichert: Zahlungsarten nach Stripe-Konfiguration filtern (5-Min.-Cache), Apple Pay/Google Pay nur auf passenden Geräten, gleiche Bestellung bei „Zurück“ weiterverwenden, Browserfehler/Timeout (20 s) als Verlauf + Mail „Zahlung hängt“ melden, Hinweis an die Kundin. Offen: Testbestellungen stornieren; beim nächsten Fall zeigt die Mail „Zahlung hängt“ bzw. der Bestellverlauf den genauen Fehler.
- Bewertungsmail fragt „Wie hast du uns gefunden?“ (8 Antworten als Links, Antwort erst auf der Seite per Klick gespeichert, auch ohne Bewertung). Speicher `order.foundVia`, Anzeige in der Bestellung und Auswertung auf der Admin-Startseite. Lokal durchgeklickt (Link → vorausgewählt → gespeichert); Unit 338.
- Wunsch der Inhaber: Frage „Wie hast du uns gefunden?“ nicht in der Mail, sondern nur im Bewertungsformular (wird mit der Bewertung gesendet, reine Info fürs Team). Mail-Block, `?quelle=` und `/api/reviews/found-via` entfernt. Test-Mail „Bewertungsanfrage“ im Admin ergänzt.
- Admin → Floristen-Budget: Button „Liste herunterladen (Excel)“ – CSV mit Produkt, Größe, Verkaufspreis und Max. Budget je Größe und Extra (`/admin/floristen-budget/export`, nur mit Admin-Anmeldung; keine Budgets im Repo).
- KI-Futter: `/llms.txt` (Überblick, llmstxt.org-Format) und `/llms-full.txt` (ganzes Sortiment mit Größen/Preisen/Blumen/Pflege, Liefergebiete mit PLZ, Gebühren, Same-Day, Zeitfenster, Bezahlung, Anlässe, alle Themenseiten, FAQ, nur verifizierte Bewertungen, Kontakt). Live aus dem CMS, stündlich neu; keine Platzhalter, Partner- oder Budgetdaten. KI-Crawler (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot) sind erlaubt.
- **Mehrsprachigkeit Phase 1 (Infrastruktur, noch nichts sichtbar):** Shop-Routen unter `app/[locale]`, Proxy schreibt `/en/flowers` → `/en/blumen` um, deutsche URLs unverändert, `/de/...` → 308. 16 Sprachen vorbereitet, nur Deutsch live (`LIVE_LOCALES`). Sprachmenü und Browser-Sprachhinweis (erscheinen erst ab 2 Live-Sprachen), hreflang/Canonical pro Sprache, Sitemap mit Sprachversionen, Schriften für Latein-Erweitert/Kyrillisch/Arabisch. Doku `docs/I18N.md`. Unit 348, E2E 41/41.
- **Mehrsprachigkeit Phase 2:** alle festen Shop-Texte (ca. 1.450) aus dem Code in Wörterbücher `src/i18n/messages/de/*` (12 Bereiche) ausgelagert – Deutsch unverändert. Liefer-Check- und Bestell-Validierungsmeldungen der API kommen in der Sprache der Kundin (`locale`). Client-Komponenten bekommen nur die nötigen Bereiche (`src/i18n/scope.tsx`, Startseite +7,5 KB gzip statt +20 KB). Unit 352, E2E 41/41, alle Seiten ohne Konsolenfehler.
- **Mehrsprachigkeit Phase 3 (Zwischenstand, weiter nichts sichtbar):** UI-Texte in allen 15 Sprachen übersetzt; Inhalte (Produkte, Kategorien, Anlässe, FAQ, Seiten, Startseite) für en, tr, bks, uk, ru, pl, ro, hu. Übersetzungen werden von den Inhabern noch geprüft.
- **Mails in Kundensprache (Phase 5, Teil 1):** Bestellung, Erinnerung und Newsletter merken sich die Shop-Sprache (`locale`, fehlt = Deutsch). Kundenmails (Bestätigung, Status, Bewertungsanfrage, Erinnerungen, Newsletter-Bestätigung, Widerruf, Login-Link) nutzen Wörterbuch `mail`, Datums-/Preisformat und Links der Sprache, Produkt-/Größen-/Statusnamen aus den Inhaltsübersetzungen. Interne und Partner-Mails bleiben Deutsch. Deutsche Mails byte-gleich wie vorher (vorher/nachher verglichen). Unit 379, E2E 41/41.
- **Mehrsprachigkeit Phase 3–4 (noch nicht sichtbar):** Inhalte und Mails in allen 15 Sprachen. Eigene Such- und Anlassseiten pro Sprache (`content/landing-pages-<locale>.json`, 177 Seiten): je 6 Suchseiten (Blumen nach Wien schicken, aus dem Heimatland, Blumenladen, Same-Day, Rosen, Trauer) plus Feiertage/Bräuche der Kultur (z. B. Anneler Günü, Materice, Slava, 8 березня, Imieniny, Dragobete, Névnap, عيد الأم, Nowruz, Sant Jordi). Keine Gebührenbeträge, keine Supportsprachen, Sonderwünsche (ungerade Stiele, Schleife) nur „auf Wunsch“. Unit 401.
- **Tschetschenisch (ce) als 17. Sprache (Wunsch der Inhaber, noch nicht sichtbar):** UI, Mails, Inhalte und 9 eigene Seiten (Lieferung Wien, aus Tschetschenien/Russland, Blumenladen, Same-Day, Rosen, 8. März, Hochzeit/ловзар, Geburt, Ураза-/Курбан-байрам). Keine Trauerblumen-Seite (bei muslimischen Beerdigungen unüblich). Überschriften-Schrift um Kyrillisch-Erweitert ergänzt (Buchstabe Ӏ). Muss vor dem Freischalten muttersprachlich gegengelesen werden.
- Admin: Bestellungen zeigen die Shop-Sprache („auf Türkisch“ in der Liste, „Sprache: bestellt auf … – Kundenmails gehen in dieser Sprache raus“ im Detail). Deutsche Bestellungen ohne Hinweis. Unit 405, E2E 41/41.
- **Vorschau-Check aller Sprachen (lokal, alle 17 Sprachen eingeschaltet):** 525 Seiten (je 20 Shop-Seiten + alle Themenseiten) ohne HTTP- und Konsolenfehler, keine deutschen Reste außer Produkt-Eigennamen. Behoben: (1) React-Hydrationsfehler bei BKS/Tschetschenisch – Chrome kennt Bosnisch/Tschetschenisch nicht, Formatierung jetzt über Serbisch-Latein bzw. Russisch (gleiche Monatsnamen); (2) Persisch zeigte Lieferdaten im persischen Sonnenkalender – jetzt gregorianisch; (3) Arabisch/Persisch: Seite ~11.000 px breit (verstecktes Newsletter-Spamfeld bei −9999 px) – Feld wie bei den anderen Formularen ausgeblendet; (4) Kopfzeile lief bei 1024 px in tr/uk/bg/es/ce über den Rand – Menüabstände bei 1024–1279 px kleiner, lange Header-Buttons erst ab 1536 px; (5) Lieferseite: Same-Day-Bestellschluss in der jeweiligen Sprache. Unit 405, E2E 41/41.
- **Alle 17 Sprachen live (Freigabe der Inhaber 19.11.):** `LIVE_LOCALES = LOCALES` – Sprachmenü, Browser-Sprachhinweis, hreflang und Sitemap für en tr bks uk ru pl ro hu ar bg fa sk it fr es ce. Rechtstexte bleiben Deutsch (mit Hinweis). Übersetzungen werden von den Inhabern nachträglich gegengelesen. Build 1.989 Seiten, Unit 405, E2E 41/41.
- **Bewertungen übersetzt (Wunsch der Inhaber):** Kundenbewertungen erscheinen in jeder Sprache übersetzt, darunter „Übersetzt aus: Deutsch · Original anzeigen“ (aufklappbar mit dem Originaltext). Übersetzungen in `content/review-translations.json`, Schlüssel = Hash des Originaltexts – wird eine Bewertung geändert, erscheint wieder das Original mit „Originalsprache: Deutsch“. Neue Bewertungen merken sich die Sprache der Bestellung (`lang`); bis sie übersetzt sind, wird das Original mit Hinweis gezeigt. Beide aktuellen Bewertungen in 16 Sprachen übersetzt.
- **Flaggen im Sprachmenü (Wunsch der Inhaber):** SVG-Flaggen (country-flag-icons, MIT; keine Emoji – Windows zeigt sie nicht), Deutsch = Österreich, BKS = Bosnien/Kroatien/Serbien; Arabisch, Persisch, Tschetschenisch bewusst mit neutralem Sprach-Symbol (Entscheidung der Inhaber). Menü am Desktop zweispaltig; Flaggen werden erst beim Öffnen geladen (~14 KB). Unit 410, E2E 41/41.
- Polnisch (Wunsch der Inhaber): „Poczta kwiatowa“ überall ersetzt (auch Firmenname in Polen) – Themenseite heißt „Dostawa kwiatów Wiedeń“ (`/pl/dostawa-kwiatow-wieden`, alte Adresse leitet dauerhaft weiter), dazu Startseite/Über-uns/SEO-Texte. Live per Content-Migration `2026-11-19-pl-dostawa-kwiatow` (gegen den alten Stand getestet).
- **Outreach (Wunsch der Inhaber):** Admin → *Outreach* für persönliche Einzelmails an Betriebe (Partneranfragen an Floristiken, Angebote an Bestatter, Hotels, Büros, Lokale). Kontakte anlegen/importieren (CSV/TSV oder aus Excel einfügen, Spalten automatisch erkannt, Vorschau, Duplikate überspringen/aktualisieren), Status-Pipeline Neu → Angeschrieben → Geantwortet → Termin → Partner/Kunde → Kein Interesse mit Zählern und Filtern, Detailseite mit Notizen und Verlauf, CSV-Export. Vorlagen mit Mini-Formatierung, Platzhaltern ({Anrede} …), Live-Vorschau, Test-Mail „[TEST]“, Kopfbild, echten Anhängen (PDF/Bild, ≤ 20 MB) und Video als Vorschaubild mit Play-Knopf; 8 Startvorlagen (6 de, 2 en) nur mit belegten Fakten, Konditionen als Gesprächsangebot. Versand jetzt oder geplant, 30-Tage-Warnung, Tageslimit `OUTREACH_DAILY_LIMIT` (50), einmaliges Nachfassen nur bei Status „Angeschrieben“, Warteschlange per Netlify-Cron alle 10 Min. (`cron-outreach`) + Button. Öffnungs-/Klick-Tracking (ungefähr, Redirect nur auf gespeicherte Links), Abmeldelink mit HMAC-Token, `/e-mail-abmelden` (de/en, noindex) und List-Unsubscribe One-Click; Abgemeldete werden nie mehr angeschrieben. `sendMail` kann jetzt Anhänge und eigene Header (Resend + SMTP). Doku `docs/OUTREACH.md`. Lokal durchgeklickt (Vorlage, Kontakte, Import, Test-Mail, Versand mit Limit, Tracking, Abmeldung, Export); Unit 463.
- Bestellung → Partner (Wunsch der Inhaber): Feld „Hinweis an die Floristik“. Der Text steht in der Auftrags-Mail ganz oben in einem orange umrandeten Kasten, fett und groß („Wichtiger Hinweis von Blumora – bitte beachten“), der Betreff beginnt mit „WICHTIGER HINWEIS –“. Gilt auch für Erinnerungs-Mails; steht im Verlauf und in der Partner-Karte. Ändern: Text anpassen und Auftrag erneut senden. Unit 465, E2E 41/41.
- Tschetschenisch, Korrekturen eines Muttersprachlers (20.11.): Startseiten-Überschrift/Claim „Кхин а дукха тайп-тайпан зезагаш.“, Kollektionen „… щи тарунг хяжан хьаьжжина.“, Bewertung „ЧӀога хаза букет ду!“. Live per Content-Migration `2026-11-20-ce-proofreading-1`.
- **Individuelle Angebote (Wunsch der Inhaber, Anlass: Anfrage einer Touristin aus Taiwan – rosa Tulpen zum Burgtheater, 29.11., 14–16 Uhr):** Admin → *Angebote* (Gruppe Verkauf) mit Liste (Status-Chips Entwurf/Gesendet/Angesehen/Bezahlt/Abgelaufen/Storniert, Suche), Formular (freie Positionen mit Foto, optional Shop-Produkt mit eigenem Preis, Extras, freie Lieferung oder „nach Absprache“, Gebühr aus der PLZ vorgeschlagen und änderbar, Hinweis an die Floristik, Rechnungsadresse/UID, gültig bis, Live-Summe) und Detailseite (Senden/erneut senden, Link kopieren für WhatsApp, Test-Mail, Mail-Vorschau, Verlauf, Storno). Private Bezahlseite `/angebot/<token>` in allen 17 Sprachen (noindex), Zahlung über Mock/Stripe/PayPal wie im Checkout; daraus entsteht eine normale Bestellung (`createOrderFromOffer`, Beträge nur vom Server, nie doppelt bezahlbar, offene Stripe-Zahlung wird wiederverwendet bzw. abgebrochen). Bestellungen aus Angeboten bekommen nie automatisch Partner oder Kurier; Kundentexte nennen keinen Lieferanten. Doku `docs/OFFERS.md`. Unit 493, E2E-Spec `tests/e2e/offers.spec.ts`.
- Angebote, Fix (Meldung der Inhaber): Der Bezahl-Link aus einer Test-Mail führte bei einem noch nicht gesendeten Entwurf auf die 404-Seite. Jetzt zeigt er eine Vorschau mit Hinweis „Vorschau – noch nicht versendet“ (17 Sprachen) statt des Bezahlbereichs; bezahlen geht erst nach Senden/„Link kopieren“, `/api/offers/pay` lehnt Entwürfe weiter ab. Admin-Detail: „Vorschau ansehen“ auch für Entwürfe. Unit 493, E2E 43/43 (neuer Test für die Vorschau).
- Zahlung (Wunsch der Inhaber): Stripe-Zahlungsfeld (Checkout + Angebotsseite) ohne „Mehr“-Dropdown am Handy. Eigene wischbare Leiste mit allen Zahlarten des Intents (Karte, Klarna, EPS, Amazon Pay …, gewählte zuerst, Tastatur-Pfeile, Radio-Gruppe); darunter zeigt Stripe nur das Formular der gewählten Methode (deferred Elements, `allowedPaymentMethodTypes`, Bestätigung gegen den bestehenden Intent). Fallback auf die klassischen Stripe-Tabs, wenn der Intent nicht lesbar ist oder Stripe die Bestätigung als Integrationsfehler ablehnt. Geprüft: Stripe lädt mit dem Live-Browser-Schlüssel alle vier Methoden im deferred-Modus (ohne Intent/Zahlung), Leiste am iPhone-Viewport (wischt, keine Seitenbreite > 390 px) mit simuliertem Intent; der Bezahlschritt selbst konnte ohne Stripe-Testschlüssel nicht im Testmodus ausgeführt werden. Unit 497, E2E 43/43.
- Bewertungen mit Video (Wunsch der Inhaber): Zusätzlich zu Fotos ein kurzes Video pro Bewertung (max. 15 s, max. 60 MB, MP4/MOV/WebM). Der Browser prüft Länge/Format, erzeugt ein Vorschaubild per Canvas und lädt in Teilen à 4 MB hoch (Netlify-Grenze ~6 MB pro Anfrage); der Server prüft Größe, Teile und Magic Bytes, speichert jeden Teil einzeln (lokal, Netlify Blobs, S3) und liefert `/media/review-videos/…` mit HTTP-Range aus (Safari). Vor der Freigabe nur für Admins abspielbar; unter Eingereicht „Video zeigen“ wie bei Fotos, nicht freigegebene/verworfene Videos werden samt Teilen gelöscht. Anzeige auf Startseite und Produktseite (`<video controls playsinline preload="none">` mit Vorschaubild). Einwilligung nennt jetzt „Fotos und Videos“; Texte in 17 Sprachen. Doku `docs/UPLOADS.md` → „Kundenvideos aus Bewertungen“.
- Zahlung in einem Schritt + Express-Kauf (Wunsch der Inhaber): Kasse Schritt 5 und Angebotsseite legen die Bestellung an und bezahlen sie auf einem Bildschirm – eigene Zahlarten-Liste bleibt, das Stripe-Feld steht direkt unter der gewählten Zahlart (deferred Elements, Apple/Google Pay nur mit der eigenen Wallet, Schrift Manrope statt Serif). „Jetzt kaufen“: `elements.submit()` im Klick → `/api/orders` (Server rechnet) → Betragsprüfung → `confirmPayment`. Neuer Versuch nach Fehler/Abbruch nutzt dieselbe Bestellung und denselben Intent (auch nach Neuladen: `/api/orders/resume`). Zweiter Bildschirm und wischbare Leiste entfernt. Neu: Express-Kauf mit Apple Pay/Google Pay/Link auf Produktseite und im Warenkorb (Express Checkout Element; PLZ/Tag/Zeitfenster vorher wählen, Wallet-Adresse nur in Liefergebieten via `/api/express/quote`, Bestellung über `/api/express/order` mit denselben Regeln wie die Kasse). Texte in 17 Sprachen; Doku docs/PAYMENTS.md, docs/OFFERS.md.
- Impressum (Wunsch der Inhaber): Abschnitt „Webdesign & Umsetzung“ – „Webshop umgesetzt von Tetik Drwal Media GesbR“ mit Link auf tdm-agency.at, nach „Kontakt“. Live per Content-Migration `2026-11-20-imprint-webdesign-credit` (gegen den alten Stand getestet).
- Nicht erfolgreiche Bestellungen im Admin (Wunsch der Inhaber: „egal wie nicht erfolgreich“): „Jetzt kaufen“ legt die Bestellung jetzt immer an – parallel zu `elements.submit()` (Apple Pay bleibt synchron im Klick); scheitert submit (Kartenfelder leer, Wallet-Fenster zu), bleibt sie „Nicht bezahlt“ mit Verlaufsnotiz („Zahlung nicht abgeschlossen: …“, `/api/orders/payment-note`), ein neuer Klick nutzt dieselbe Bestellung. Neu „Abgebrochene Kasse“: Momentaufnahme ab Schritt 4/5 (Kontakt, Warenkorb, Adresse, Liefertag) bzw. beim Schließen des Express-Wallets (PLZ, ohne Kontaktdaten) über `/api/checkout/draft`, gelöscht bei Bestellung aus derselben Sitzung oder nach 30 Tagen; Admin → Bestellungen → Filter „Abgebrochene Kasse“. Neuer stündlicher Cron `/api/cron/stale-orders` (+ Admin-Button): unbezahlt nach 2 Std. → abgebrochen, Bestand frei, Stripe wird vorher gefragt. Datenschutzerklärung muss die Speicherung noch erwähnen (Inhaber). Doku docs/PAYMENTS.md, docs/DEPLOYMENT.md.
- Fix Express-Kauf (Meldung der Inhaber: „finde nix“): Die Express-Buttons blieben unsichtbar, weil Stripe die Layout-Option `overflow: "never"` mit `maxRows: 3` ablehnt (IntegrationError). Jetzt `maxRows: 0`; Block erscheint (lokal mit Live-Browser-Schlüssel geprüft, ohne Zahlung). Stripe-UI-E2E prüft jetzt zusätzlich, dass Stripe keine Fehler wirft.
- Express-Kauf (Wunsch der Inhaber): nicht mehr auf der Produktseite, sondern im Warenkorb direkt unter „Sicher zur Kasse“ – kompakt: Trenner „oder“ + Wallet-Buttons; PLZ/Liefertag/Zeitfenster nur, wenn sie am Warenkorb-Artikel fehlen. Neuer Text `pay.express.or` in 17 Sprachen.
- Kundenvideo im Admin hochladen (Wunsch der Inhaber, z. B. Clip per WhatsApp): Bewertung bearbeiten → „Video hochladen“/Drag & Drop mit Vorschau, Fortschritt und „Video entfernen“; gleiche Pipeline wie bei Kund:innen (Probe im Browser, ≤ 15 s, 4-MB-Teile, Magic Bytes) über die neue Admin-Route `/api/admin/reviews/video` (Admin-Sitzung in jedem Schritt, sofort freigegeben); füllt Pfad, Vorschaubild, Länge, Größe und Alternativtext. Doku docs/UPLOADS.md.
- Bewertungen (Wunsch der Inhaber): Im Admin-Bewertungsformular Feld „Originalsprache“ (17 Sprachen) und Abschnitt „Übersetzungen“ (je Sprache, optional). Seite in der Originalsprache zeigt den Originaltext ohne Hinweis; andere Sprachseiten zeigen die Übersetzung mit „Übersetzt aus: … · Original anzeigen“, ohne Übersetzung den Originaltext mit „Originalsprache: …“. Admin-Übersetzungen haben Vorrang vor dem Dokument `review-translations`.
- Fix Zahlungs-Logos (Meldung der Inhaber): Apple Pay war weiß auf weiß (Footer und Kasse Schritt 5), Klarna ohne Markenfarbe – die Standard-Klasse bg-white überschrieb bg-black/rosa, weil `cn` Klassen nur verbindet. Logos mit eigenem Hintergrund nutzen jetzt eine Basis ohne bg.
- HOTFIX Zahlung (Meldung „Zahlung hängt bei BQ-JG4EAL“, Google Pay): Stripe lehnt die Bestätigung von Elements mit `allowedPaymentMethodTypes` gegen unsere PaymentIntents (automatic_payment_methods) ab: „Payment details were collected through Stripe Elements using allowed_payment_method_types cannot be confirmed through the API configured with automatic payment methods or payment_method_types“. Inline-Zahlungsfeld (Kasse Schritt 5, Angebotsseite) jetzt ohne allowedPaymentMethodTypes (dynamische Zahlarten wie in Stripes Anleitung), gewählte Methode per paymentMethodOrder vorne; die anderen Stripe-Methoden erscheinen als Reiter. Express-Kauf war nicht betroffen (keine Einschränkung).
- Admin → Bestellungen (Wunsch der Inhaber): Export mit allen Daten – „Export Bestellungen (CSV)“ (eine Zeile pro Bestellung: Status, Zahlung inkl. Anbieter/ID, Besteller, Empfänger, Lieferung, Positionen, Kartentexte, Summen, Gutschein, Einkauf Floristik, Partner, Kurier, Gefunden über, Angebot, Rechnungsadresse, interne Notiz, Verlauf), „Positionen (CSV)“ (eine Zeile pro Strauß) und „Alles (JSON)“. Übernimmt Filter und Suche der Liste; Excel-Format (Semikolon, UTF-8 BOM, Dezimalkomma, Wiener Zeit); Tracking- und Bestätigungs-Token werden nie exportiert; Formel-Schutz. Route `/admin/bestellungen/export` (nur Admin). Unit 590, E2E 53.
- Partner-Portal Stufe 1 (von den Inhabern freigegeben): `/partner` für Partner-Floristiken (nur Deutsch, noindex, außerhalb der Sprach-Routen) – Login per Magic Link an freigeschaltete Adressen (eigene Sitzung `bl_partner`, 90 Tage, neutrale Antwort ohne Enumeration, Rate-Limits), Übersicht „Offen“, anstehende Aufträge mit „Bestätigen“ (gleiche Wirkung wie der Link im Auftrag), erledigte Aufträge je Monat mit bezahlt/offen (FIFO). Admin → Partner-Abrechnung: Portal-E-Mails, „Abrechnung ab“, Zahlungen/Korrekturen, Aufträge ohne Partner nachträglich zuordnen (ohne Mail/Kurier), CSV je Monat. Auftragsmail verlinkt aufs Portal. Abrechnungsregeln rein & getestet (`src/lib/partner-ledger.ts`). Doku docs/PARTNER-PORTAL.md.
- HOTFIX Apple Pay in der Kasse (BQ-JEQ7AM, Kundin konnte nicht zahlen): POST /api/orders lief parallel zu elements.submit(); Safari brach die Anfrage beim Öffnen des Apple-Pay-Fensters ab (Netlify-Log: 499 nach 0,4 s). Die Bestellung entstand serverseitig, die Seite bekam keine Antwort, zeigte „Verbindungsfehler“ und bestätigte die Zahlung nie (Stripe: Unvollständig ohne Versuch). Jetzt Stripes dokumentierte Reihenfolge: erst submit() abwarten, dann Bestellung anlegen (bei abgebrochener Verbindung einmal wiederholen), dann confirmPayment. Angebotsseite machte es bereits so.
- Express-Kauf entfernt (Entscheidung der Inhaber): Warenkorb-Fenster und Warenkorbseite zeigen nur noch „Sicher zur Kasse“; Express-Komponenten, /api/express/* und lib/express entfernt. Apple Pay/Google Pay bleiben in der Kasse (Schritt 5). Begründung in docs/PAYMENTS.md.
- WhatsApp Business & Social Links (Wunsch der Inhaber, kein Trustpilot): Einstellungen `brand.social.whatsapp/instagram/x/linkedin` + `whatsappSupport247` (Admin „WhatsApp & Social Media“, Content-Migration nur für fehlende Werte). Schwebender WhatsApp-Button im Shop (nicht in der Kasse/Zahlungsrückkehr, weicht Warenkorb, Suche, Menü, Cookie-Hinweis und der mobilen „In den Warenkorb“-Leiste aus, RTL links), WhatsApp in Hero-Vertrauenszeile, Kontakt, FAQ, Bestellstatus, Bestellbestätigung, Kasse; Footer-Icons Instagram/X/LinkedIn/WhatsApp; „Folge uns auf Instagram“ auf Startseite und Über uns; `sameAs` im JSON-LD. Alle Texte in 17 Sprachen; 24/7 nur per Schalter. Doku docs/ADMIN.md.
- Seite „Anfrage“ (Wunsch der Inhaber): Sonderwünsche und Lieferfragen (Uhrzeit, Ort, bestimmter Strauß, größere Bestellung) in allen 17 Sprachen (`/anfrage`, `/en/enquiry` …, Sitemap mit hreflang), optionales Foto (wie Bewertungsfotos, privat nur für Admins), Bestätigungsmail in der Sprache der Kund:in (verspricht nur eine Antwort), Team-Mail mit Foto. Admin → Anfragen: Anfragen + Kontaktnachrichten in einer Liste, Status/Notiz, E-Mail/Telefon/WhatsApp, „Angebot erstellen“ füllt das Angebotsformular vor und verknüpft beides. Mobiles Menü: „Anfrage stellen“. Doku docs/INQUIRIES.md.

## 2026-11-23 – Links zur Anfrage-Seite
- Footer (Service-Spalte), Kontaktseite (Kachel unter den Kontaktdaten), FAQ (Abschluss-Box) und Produktseite (Abschnitt „Lieferung“, mit `?produkt=<slug>` vorausgewählt) verlinken auf /anfrage.
- Nutzt die vorhandenen Texte „Anfrage stellen“ / „Uhrzeit, Ort, Wunschstrauß“ – in allen Sprachen bereits übersetzt.
- E2E: `custom-request.spec.ts` prüft alle vier Links (de + en). Volle Suite: 623 Unit, 71 E2E grün.

## 2026-11-23 – PayPal über Stripe
- PayPal ist im Stripe-Konto aktiviert. `providerForMethod("paypal")`: direkte PayPal-App, wenn `PAYPAL_*` gesetzt ist, sonst Stripe, sonst ausgeblendet.
- Kasse: PayPal öffnet unter dem Eintrag das Stripe Payment Element mit PayPal-Tab (Hinweis „Nach ‚Jetzt kaufen‘ bestätigst du die Zahlung bei PayPal“). Fortsetzen einer abgebrochenen Zahlung (`/api/orders/resume`) erlaubt PayPal.
- Sichtbar erst, wenn PayPal im Admin → Zahlungsarten eingeschaltet wird.
- Tests: Unit (Routing, Elements-Konfiguration), E2E `stripe-inline` mit echtem Stripe-Formular im Deferred-Modus (kein PaymentIntent, keine Zahlung) – PayPal-Tab sichtbar. Echte PayPal-Zahlung + Erstattung macht das Team.
