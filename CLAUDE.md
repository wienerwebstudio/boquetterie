# Boquetterie – Blumenversand Wien

Next.js 16 (App Router, `src/`), TypeScript, Tailwind v4, Zustand. Language of the UI: German (de-AT).

## Architecture
- `content/*.json` – all admin-editable content (products, occasions, categories, extras, delivery zones, coupons, faqs, reviews, settings, homepage, pages, landing pages). Typed in `src/types/index.ts`.
- `data/*.json` – runtime data (orders, newsletter). Git-ignored.
- `src/lib/cms.ts` – the ONLY file touching the filesystem. Server only. Swap for a DB later.
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
- Run `npx tsc --noEmit && npx next build` before committing.
