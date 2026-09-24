# Bloomery – Blumenversand Wien

Next.js 16 (App Router, `src/`), TypeScript, Tailwind v4, Zustand. Language of the UI: German (de-AT).

## Architecture
- `content/*.json` – all admin-editable content (products, occasions, categories, extras, delivery zones, coupons, faqs, reviews, settings, homepage, pages, landing pages). Typed in `src/types/index.ts`.
- `data/*.json` – runtime data (orders, newsletter, customers, reminders, …). Git-ignored.
- `src/lib/cms.ts` – the ONLY data-access layer (server only). It reads/writes through `src/lib/store/` (`json` files by default, `postgres` when `DATABASE_URL` is set). Never touch the filesystem elsewhere.
- `src/lib/payments.ts` + `src/lib/payments/*` – provider abstraction (mock / stripe / paypal, chosen by env vars). Amounts always come from the server-side order. `src/lib/orders.ts` owns order creation, stock reservation and payment state transitions.
- `src/lib/mail.ts` + `src/lib/mail/*` – mail provider (resend / console), templates, reminders, review requests, cron helpers.
- `src/lib/auth/*` – customer magic-link sessions; `src/lib/admin-session.ts` – admin cookie. `src/lib/rate-limit.ts` – in-memory limiter used by every public API route.
- `src/lib/uploads.ts` – admin image uploads (local or S3), processed with sharp.
- `src/lib/delivery.ts` – delivery engine (zones by PLZ, available days, same-day, fees). Pure; no hard-coded districts.
- `src/lib/catalog.ts` – filtering, sorting, search (with synonyms, e.g. "Mama").
- `src/store/*` – Zustand stores: `cart` (persisted), `ui` (drawer/search/toasts), `favorites`, `delivery` (PLZ context).
- `src/components/ui/*` – design system primitives. `src/components/layout/*` – header/footer/shell.
- `src/app/api/delivery/check` – PLZ check endpoint used by hero, PDP and checkout.

## Design system (see `src/app/globals.css`)
Colors: `ivory` bg, `forest` primary, `sand`/`stone`/`line` neutrals, `rose`/`burgundy` accents, `ink` text.
Type: `font-serif` (Cormorant Garamond) for headlines via `display-1/2/3`, `font-sans` (Manrope) for UI. `eyebrow` utility for small caps labels. `container-x` for page width.
Tone: editorial, calm, lots of whitespace, subtle motion (`animate-fade-up`, `Reveal`). No emoji in UI, use lucide line icons.

## Conventions
- Pages are Server Components; interactive parts are small client components.
- `params`/`searchParams` are Promises in Next 16 – `await` them.
- Prices in EUR via `formatPrice`. Dates as `YYYY-MM-DD` strings via `formatDateShort/Long`.
- Never invent company facts, reviews, or delivery guarantees. Placeholders are marked `[…]`.
- Every optional integration is env-activated with a working fallback (mock payments, console mail, JSON store, local uploads). Document new env vars in `.env.example` and the matching `docs/*.md`.
- Public API routes: rate-limit first (`enforceRateLimit`), validate the body, never trust client amounts.
- Run `npx tsc --noEmit && npx eslint . --max-warnings=0 && npm run test:unit && npx next build` before committing; `npx playwright test` for E2E + a11y (see `docs/TESTING.md`).
