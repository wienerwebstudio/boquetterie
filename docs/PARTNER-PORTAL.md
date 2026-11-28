# Partner-Portal (Stufe 1)

Ein schlichter Bereich für Partner-Floristiken unter **`/partner`**: anstehende Aufträge ansehen und bestätigen, sehen, was offen und was schon bezahlt ist. Nur Deutsch, außerhalb der Shop-Sprachen (`src/app/partner/**`), eigenes Layout, `noindex`, in `robots.txt` gesperrt, nicht in der Sitemap.

## Für die Inhaber: einrichten

1. **Admin → Partner-Abrechnung → Partner wählen → „Portal-Zugang“.** Standard: die Auftrags-Adressen des Partners (Admin → Partner bzw. `MAIL_FLORIST`) dürfen sich anmelden. Haken entfernen und eigene Adressen eintragen (eine pro Zeile), wenn andere Adressen das Portal nutzen sollen. Adresse entfernen = Sitzung endet sofort.
2. **„Abrechnung ab“**: die Bestellung wählen, NACH der abgerechnet wird (die gewählte selbst zählt nicht). Ohne Einstellung zählen alle Bestellungen.
3. **„Aufträge ohne Partner zuordnen“**: bezahlte Bestellungen ohne Partner (nach „Abrechnung ab“) ankreuzen → werden dem Partner zugeordnet, **ohne** Auftragsmail und **ohne** Kurierbuchung. Mit „Gleich als bestätigt zählen“ (Standard) zählen sie sofort in der Abrechnung.
4. **„Zahlung erfassen“** (Betrag, Datum, Notiz) nach jeder Überweisung; **„Korrektur“** (+/−, mit Grund) für alles andere. Beides lässt sich bearbeiten und (mit Rückfrage) löschen.
5. **Abrechnung als PDF** (Standard): pro Partner Bestellnummer, Bestellt, Akzeptiert (Partner-Bestätigung), Liefertag, Status und Budget netto mit Summe (`src/lib/partner-pdf.ts`, pdf-lib, Standardschrift; `&format=pdf`). Ohne Kundendaten und Verkaufspreise – zum Schicken an den Partner. **Excel**: geschuldete Aufträge als CSV (Semikolon, UTF-8 BOM, Dezimalkomma) – zum Abgleich mit den Partner-Rechnungen. Oben in Partner-Abrechnung: „Export für Partner-Rechnungen“ (ein Partner oder alle, Liefermonat oder alles, optional nur offene; Summe je Partner + Gesamt). Pro Partner zusätzlich „Alle offenen“, „Gesamt“ und je Liefermonat. Route `/admin/partner-abrechnung/export?partner=<id|all>&month=YYYY-MM&scope=open`.

Jede Auftragsmail an den Partner enthält unten „Alle Aufträge im Partner-Portal ansehen“ → `https://<site>/partner`.

## Was der Partner sieht

- **Offen** (groß) – darunter „X Aufträge · bisher bezahlt: Y €“.
- **Anstehend**: zugeordnete, bezahlte Aufträge, die noch nicht geliefert/storniert sind, nach Liefertag und Fenster: Liefertag, Fenster, Kurier-Abholung (falls gebucht), Strauß (Name, Größe, Farbe, Menge), Extras, Kartentext (inkl. Absender auf der Karte), Wunsch der Kund:in, **Hinweis des Teams** (fett), Betrag netto. Solange nicht bestätigt: großer Button **„Bestätigen“** – gleiche Wirkung wie der Link „Auftrag bestätigen“ in der Auftragsmail (`partner.confirmedAt`, Eintrag im Verlauf, Info-Mail an `MAIL_ADMIN`).
- **Erledigt**: je Liefermonat („Dezember: 23 Aufträge · 812,00 €“), je Zeile Datum, Strauß, Betrag, Badge „bezahlt“/„offen“.

**Nie** sichtbar: Verkaufspreise/Summen, Besteller:in (Name, E-Mail, Telefon), Empfänger-Nachname/Adresse/Telefon (die Zustellung macht der Kurier – nur Vorname + PLZ/Gebiet), Aufträge anderer Partner, unbezahlte Bestellungen, Token, interne Notizen, „Betrag fehlt“-Hinweise.

## Abrechnungsregeln (`src/lib/partner-ledger.ts`, rein, Unit-Tests)

- **Betrag je Auftrag** = Floristen-Budget netto der Positionen + Extras (× Menge, ohne USt). Zuerst der beim Auftrag gespeicherte Wert (`floristBudget`), sonst die **aktuelle** Budgetliste (Admin → Floristen-Budget, gleiche Zuordnung wie im Auftrag). Fehlt beides, zählt dieser Teil 0 € und der Auftrag ist im Admin mit **„Betrag fehlt“** markiert (nur Admin) – dann eine Korrektur erfassen.
- **Geschuldet** ist ein Auftrag, sobald der Partner ihn bestätigt hat – auch wenn er später storniert wird. **Übergang:** vor dem Portal-Start (`PORTAL_LAUNCH`, 23.11.2026) gelieferte Aufträge ohne Bestätigung zählen als bestätigt (die Daten werden nicht umgeschrieben). Danach gelieferte, aber nie bestätigte Aufträge zählen nicht und stehen im Admin als Hinweis.
- Es zählen nur **bezahlte** Bestellungen (ein bestätigter Auftrag, der später erstattet wurde, bleibt geschuldet) und nur solche **nach „Abrechnung ab“** (exklusiv, nach `createdAt`). Bestellungen vor dem 18.11.2026 gelten wie bisher als Blumen Dody zugeordnet (`src/lib/partners.ts`).
- **Offen** = geschuldet + Korrekturen − Zahlungen.
- **bezahlt/offen-Badge (FIFO):** Das Guthaben (Zahlungen − Korrekturen) begleicht die ältesten geschuldeten Aufträge zuerst (nach Liefertag, dann Bestelldatum). Eine positive Korrektur verbraucht also zuerst Guthaben, eine negative wirkt wie eine Zahlung.

## Technik & Sicherheit

| Teil | Datei |
| --- | --- |
| Login-Seite + Übersicht | `src/app/partner/page.tsx` (+ `login-form.tsx`, `confirm-button.tsx`, `actions.ts`) |
| Link-Landeseite (GET loggt nie ein, Button → POST) | `src/app/partner/anmelden/page.tsx` |
| Link anfordern / einlösen / abmelden | `src/app/api/partner/request-link`, `verify`, `logout` |
| Token, Sitzung, Allow-List | `src/lib/partner-auth.ts` |
| Bestätigen (geteilt mit dem Link in der Auftragsmail), Laden | `src/lib/partner-portal.ts` |
| Abrechnungsregeln, Partner-Sicht, CSV | `src/lib/partner-ledger.ts` |
| Admin | `src/app/admin/partner-abrechnung/**`, `src/components/admin/partner-billing-forms.tsx` |

- **Eigene Sitzung**: Cookie `bl_partner` (httpOnly, sameSite=lax, secure in Produktion, 90 Tage), HMAC-SHA256 mit eigenem Präfix – Kunden- (`bl_session`) und Admin-Cookies (`bl_admin`) können nie als Partner-Sitzung gelten. Secret `PARTNER_SECRET`, sonst `ADMIN_SECRET` (≥ 16 Zeichen). Bei jedem Aufruf wird geprüft, dass der Partner aktiv und die Adresse noch freigeschaltet ist.
- **Magic Link**: 32 Zufallsbytes, gespeichert nur als SHA-256 (`data/partner-auth-tokens.json` bzw. Postgres), 30 Minuten, einmalig.
- **Keine Enumeration**: `/api/partner/request-link` antwortet immer „Falls die Adresse freigeschaltet ist, kommt gleich ein Link …“; die Mail geht nach der Antwort raus (`after`), bekannte und unbekannte Adressen brauchen gleich lang.
- **Rate-Limits** zuerst in jedem öffentlichen Endpunkt: Link anfordern 5/10 min je IP + 3/10 min je Adresse, Einlösen 20/10 min, Abmelden 30/10 min, Bestätigen 30/10 min je IP.
- **Nur eigene Daten**: jede Abfrage filtert nach der Partner-ID der Sitzung; „Bestätigen“ prüft Partner, Zahlung und Storno erneut im Schreibvorgang. Die Partner-Sicht ist eine eigene Projektion (`toPartnerView`), die keine Kunden- oder Preisfelder enthält.
- **Daten** (nie im öffentlichen Repository): `partner-portal` (Portal-Adressen, „Abrechnung ab“), `partner-ledger` (Zahlungen/Korrekturen), `partner-auth-tokens` – Laufzeitdokumente über `src/lib/cms.ts` (JSON-Dateien in `data/` oder Postgres).

## Tests

- Unit: `tests/unit/partner-ledger.test.ts` (Beträge Snapshot/aktuelle Liste/fehlend, bestätigt vs. Altbestand geliefert, „Abrechnung ab“, nur bezahlt, Korrekturen, FIFO, Partner-Sicht ohne Kundendaten, CSV, Portal-Link in der Auftragsmail), `tests/unit/partner-portal-auth.test.ts` (Sitzung, Token, Allow-List, Partner A kann B nicht bestätigen).
- E2E: `tests/e2e/partner-portal.spec.ts` – Admin schaltet Adresse frei und erfasst eine Zahlung, Partner meldet sich per Link an (aus `data/mail-outbox.json`, nur mit `MAIL_CONSOLE_OUTBOX=true` und Konsolen-Mail – nie live), sieht „Offen“, bestätigt, Betrag steigt; ohne Anmeldung nur der Login.
