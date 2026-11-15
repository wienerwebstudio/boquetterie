# Improvement Log – Blumora (bloomery.at)

Fortlaufendes Arbeitsprotokoll des autonomen Verbesserungszyklus (Research → Audit → Design → Implement → Test → Measure → Review → Improve). Wer hier weiterarbeitet: zuerst Abschnitt 9 lesen.

Hinweise zur Lage:
- Marke ist **Blumora**, die Domain ist vorerst noch `bloomery.at` (blumora.at ist nicht registriert). Dateiname wie beauftragt.
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

Weitere Audits (visuelle Prüfung auf 8 Viewports, Code-Audit SEO/Sicherheit/A11y/Performance, Wettbewerbsrecherche) laufen; Ergebnisse folgen hier.

## 3. Priorisierte Probleme

| Prio | Problem | Status |
| --- | --- | --- |
| P1 | CI instabil (Fonts, a11y-Timeout) | behoben, CI-Lauf abwarten |
| P1 | Erfundene Bewertungen öffentlich | behoben |
| P1 | Falsche Aussagen zu Studio/Zustellung/Verpackung | behoben (Startseite, Über uns, Lieferung, FAQ) |
| P1 | Abo mit erfundenen Preisen | ausgeblendet |
| P1 | Impressum, AGB, Datenschutz, Widerruf nur Platzhalter | **offen – braucht Firmendaten und Rechtstexte** |
| P2 | Ergebnisse der laufenden Audits | offen |

## 4. Implementierte Verbesserungen

### Zyklus 1 – Stabilität und Wahrheit (2026-11-15)
- **Schriften selbst gehostet** (`src/fonts/`, Manrope + Cormorant Garamond als Variable Fonts, SIL OFL): kein Google-Abruf mehr beim Build oder im Browser; 3 Dateien (25 + 38 + 39 KB) statt einer Datei je Schnitt.
- **`gotoPage` in den Tests** wartet auf `domcontentloaded` und gibt `load` höchstens 20 s. Die Tests prüfen danach ohnehin konkrete Elemente.
- **Bewertungen geleert** (`content/reviews.json` = `[]`); der Bereich erscheint erst wieder mit echten, freigegebenen Bewertungen.
- **Abo ausgeblendet** (`settings.subscriptionEnabled = false`): Navigation, Startseiten-Teaser, Seite und API sind damit aus. Im Admin wieder einschaltbar, sobald es ein echtes Angebot gibt.
- **Texte korrigiert:** Startseite (Handwerk-Block), Über uns (neu: „Wie wir arbeiten“, „Die Lieferung“; Studio- und Platzhalter-Abschnitt entfernt), Lieferseite, FAQ (Zeitfenster, Zustellung, Karte, Frische, Foto).

## 5. Testergebnisse

| Datum | Was | Ergebnis |
| --- | --- | --- |
| 2026-11-15 | `tsc`, `eslint`, Unit (Vitest) | grün, 119 Tests |
| 2026-11-15 | `next build` | grün |
| 2026-11-15 | Playwright E2E + a11y lokal im CI-Modus (Build mit Test-Katalog) | 29/29 bestanden |

## 6. Messwerte vor/nach

| Messung | Vorher | Nachher |
| --- | --- | --- |
| Font-Dateien (Build) | über Google, je Schnitt | 3 lokale Dateien, 102 KB gesamt |
| CI-Erfolgsquote | 9/14 Läufe | wird beobachtet |

Lighthouse-Basiswerte: noch nicht gemessen.

## 7. Offene technische Probleme

- Cormorant-Italic wird auf jeder Seite vorgeladen, obwohl sie selten gebraucht wird (P3).
- GitHub-Actions-Warnung: Actions laufen noch auf Node 20 (`actions/checkout@v4` usw.).

## 8. Offene Geschäftsfragen (können nicht ohne Inhaber entschieden werden)

- Firmendaten, Impressum, AGB, Datenschutzerklärung, Widerrufsbelehrung.
- „inkl. MwSt.“ auf der Produktseite: Die Kalkulation rechnet ohne USt (Kleinunternehmer?). Klären.
- Same-Day: Zonen erlauben Bestellung bis 12:00 für denselben Tag. Vom Floristen bestätigt?
- Liefertage Mo–Sa: Öffnungszeiten des Floristen unbestätigt.
- Vase und Trauerschleifen auf den Fotos: im Preis enthalten?
- Stripe, Datenbank, Mail, RiderX-Live-Zugang einrichten; danach Bestellsperre aufheben.

## 9. Nächste konkrete Schritte

1. CI-Lauf nach dem Push prüfen.
2. Ergebnisse der drei Audits einarbeiten und priorisieren (Abschnitt 2 und 3 ergänzen).
3. Startseite/Hero: Preisanker und Lieferversprechen sichtbar machen.
4. SEO-Grundlagen (Sitemap ohne Abo, Canonicals, strukturierte Daten prüfen).
5. Lighthouse-Basis messen (mobil) für `/`, `/blumen`, `/produkt/red-passion`.
