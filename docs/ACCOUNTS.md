# Kundenkonto (Login ohne Passwort)

Kund:innen melden sich ausschließlich per **Magic Link** an: E-Mail eingeben, Link aus der Mail
bestätigen, fertig. Es gibt keine Passwörter, kein Passwort-Reset und keine Registrierung –
das Konto entsteht beim ersten Login.

## Ablauf

1. `/konto` (ausgeloggt) zeigt die Login-Karte. Das Formular schickt `POST /api/auth/request-link { email }`.
2. Der Endpoint antwortet **immer** mit `200` und derselben Nachricht (keine Auskunft darüber, ob die
   Adresse bekannt ist), legt einen Token an und verschickt die Mail
   „Dein Login-Link für Bloomery“ mit `{siteUrl}/auth/verify?token=…`.
3. `/auth/verify?token=…` prüft den Token (ohne ihn zu verbrauchen) und zeigt einen Button
   „Jetzt anmelden“. Der Button sendet `POST /api/auth/verify`. Dieser Zwischenschritt ist Absicht:
   Mail-Scanner (Outlook Safe Links & Co.) rufen GET-Links auf und würden einen Einmal-Token sonst
   verbrauchen, bevor die Person klickt.
4. `POST /api/auth/verify` verbraucht den Token, legt den Kunden in `data/customers.json` an bzw.
   aktualisiert `lastLoginAt`, setzt das Cookie `bl_session` und leitet auf `/konto?willkommen=1`.
5. `/konto` (eingeloggt): Bestellungen (`getOrdersByEmail`), Empfänger:innen (aus den Bestellungen
   abgeleitet), Favoriten (Browser-Store), Profil (Server Function `updateProfileAction`),
   Link zu `/erinnerung`, Abmelden (`POST /api/auth/logout`).

Beim ersten Login werden Vor-/Nachname und Telefon aus der jüngsten Bestellung mit dieser Adresse
vorbefüllt (falls vorhanden).

## Sicherheit

| Baustein | Umsetzung |
| --- | --- |
| Token | 32 Zufallsbytes (hex), nur der `sha256` liegt auf der Platte, 15 Minuten gültig, einmalig; abgelaufene Einträge werden bei jedem Schreiben entfernt |
| Vergleich | `crypto.timingSafeEqual` – für Token-Hashes und die Cookie-Signatur |
| Cookie | `bl_session` = `base64url({customerId, exp})` + HMAC-SHA256; `httpOnly`, `SameSite=Lax`, `secure` in Produktion, 30 Tage. Keine E-Mail, kein Profil im Cookie |
| Rate Limits | `request-link`: 5 Anfragen / 10 Minuten pro IP **und** pro E-Mail (`src/lib/rate-limit.ts`, In-Memory) |
| Enumeration | Gleiche Antwort für bekannte und unbekannte Adressen; Mailversand läuft asynchron |
| Honeypot | Feld `website` im Login-Formular – gefüllt = still ignoriert |
| Trennung | Eigener Payload-Prefix, ein Kunden-Cookie kann nie als Admin-Cookie durchgehen (auch bei gemeinsamem Secret) |

Server Functions (`src/app/(shop)/konto/actions.ts`) prüfen die Sitzung selbst über
`getCurrentCustomer()` – sie sind auch per direktem POST erreichbar.

## Umgebungsvariablen

| Variable | Pflicht | Bedeutung |
| --- | --- | --- |
| `AUTH_SECRET` | empfohlen | Signiert das Sitzungs-Cookie (≥ 16 Zeichen, z. B. `openssl rand -hex 32`). Fällt auf `ADMIN_SECRET` zurück. Fehlen beide, ist der Login deaktiviert – `/konto` und `/auth/verify` sagen das klar. Ändern loggt alle Kund:innen aus. |
| `NEXT_PUBLIC_SITE_URL` | empfohlen | Basis des Links in der Mail. Fallback: `settings.seo.siteUrl` (Produktionsdomain). |
| `RESEND_API_KEY`, `MAIL_FROM` | Produktion | Siehe `src/lib/mail.ts`. Ohne Key: Console-Provider. |

## Dateien

| Datei | Inhalt |
| --- | --- |
| `data/auth-tokens.json` | `{ tokenHash, email, createdAt, expiresAt }[]` – kurzlebig |
| `data/customers.json` | `{ id, email, createdAt, lastLoginAt, firstName?, lastName?, phone? }[]` |

Beide liegen unter `/data` (git-ignored) und werden ausschließlich über `readData`/`writeData`
aus `src/lib/cms.ts` gelesen und geschrieben – ein späterer Wechsel auf eine Datenbank betrifft nur
`src/lib/auth/tokens.ts` und `src/lib/auth/customers.ts`.

Code: `src/lib/auth.ts` (Lesen der Sitzung), `src/lib/auth/session.ts` (HMAC-Cookie),
`src/lib/auth/tokens.ts`, `src/lib/auth/customers.ts`, `src/lib/auth/mail.ts`,
`src/app/api/auth/*`, `src/app/(shop)/auth/verify`, `src/app/(shop)/konto`, `src/components/account/*`,
Typen in `src/types/auth.ts`.

## Lokal testen (Console-Mailprovider)

Ohne `RESEND_API_KEY` landet keine Mail im Postfach – der Link steht im Server-Log.

```bash
AUTH_SECRET=$(openssl rand -hex 32) NEXT_PUBLIC_SITE_URL=http://localhost:3000 npx next dev
```

1. `http://localhost:3000/konto` öffnen, E-Mail eingeben, „Login-Link senden“.
2. Im Terminal erscheint ein Block `[auth] Magic link for … ` mit der URL.
3. URL im Browser öffnen → „Jetzt anmelden“ → `/konto` zeigt die Begrüßung.

Per `curl`:

```bash
curl -s -X POST localhost:3000/api/auth/request-link -H 'content-type: application/json' -d '{"email":"test@example.com"}'
# Link aus dem Log kopieren, dann:
curl -s -i -X POST localhost:3000/api/auth/verify -d 'token=<TOKEN>'   # Set-Cookie: bl_session=…
curl -s localhost:3000/konto -H 'cookie: bl_session=<WERT>' | grep -o 'Hallo[^<]*'
```

Testdaten danach entfernen: `rm data/auth-tokens.json data/customers.json`.

## Ausblick: Checkout aus dem Konto vorbefüllen (nicht umgesetzt)

- Im Checkout (Server Component) `getCurrentCustomer()` aufrufen und `firstName`, `lastName`,
  `email`, `phone` als `defaultValues` an das Kundenformular geben; die E-Mail bleibt editierbar.
- Empfänger:innen aus `deriveRecipients(await getOrdersByEmail(customer.email))` als
  Auswahlliste („Wie beim letzten Mal an …“) über dem Adressformular anbieten.
- Beim Anlegen der Bestellung (`createOrderFromPayload`) `order.customerId` setzen, wenn eine Sitzung
  vorliegt – das Feld existiert bereits optional im `Order`-Typ. Damit könnten Bestellungen später
  auch nach Kunden-ID statt nur nach E-Mail gelistet werden.
- Optional: nach dem Kauf ohne Konto einen Magic Link in die Bestellbestätigung legen
  („Bestellungen im Konto ansehen“) – die Adresse ist dann bereits verifiziert.

## Offene Punkte

- Rate Limits sind In-Memory (ein Prozess). Für mehrere Instanzen den Store in `src/lib/rate-limit.ts` tauschen.
- Es gibt keine Möglichkeit, das Konto oder die E-Mail-Adresse selbst zu ändern/zu löschen (DSGVO-Auskunft/Löschung derzeit manuell über `data/customers.json`).
- `/erinnerung` wird verlinkt, sobald die Erinnerungs-Seite existiert.
