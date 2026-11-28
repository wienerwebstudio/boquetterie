/**
 * Pure helpers that turn shop state into analytics props (see docs/ANALYTICS.md).
 * No personal data leaves these functions: postal codes become a coarse region,
 * the PLZ filter becomes "set", paths become a page type.
 * Isomorphic and side-effect free, so they can be unit-tested.
 */
import type { CartItem } from "@/types";
import type { ShopParams } from "@/lib/shop-filters";
import { isUnprefixedSystemPath, resolvePublicPath, stripLocale } from "@/i18n/paths";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Line value in EUR incl. extras – what the line adds to the cart subtotal. */
export function cartLineValue(item: Pick<CartItem, "quantity" | "extras" | "snapshot">): number {
  const extras = item.extras.reduce((s, e) => s + e.price * e.quantity, 0);
  return round2(item.snapshot.unitPrice * item.quantity + extras);
}

export type RegionGroup = "wien" | "noe" | "other";

/** Coarse region of an Austrian postal code – never send the code itself. */
export function regionGroup(postalCode: string): RegionGroup {
  const first = postalCode.trim().charAt(0);
  if (first === "1") return "wien";
  if (first === "2" || first === "3") return "noe";
  return "other";
}

export type PageType = "home" | "product" | "category" | "occasion" | "checkout" | "contact" | "faq" | "landing" | "other";

/** German first path segments of real routes under app/[locale]/(shop). Anything else with one segment is a landing page (`[slug]`). */
const STATIC_SEGMENTS = new Set([
  "agb", "anfrage", "angebot", "anlaesse", "auth", "bestellung", "bestellung-verfolgen", "bewertung", "blumen", "blumen-abo",
  "checkout", "datenschutz", "e-mail-abmelden", "erinnerung", "faq", "firmenkunden", "geschenkfinder", "geschenksets",
  "impressum", "kontakt", "konto", "lieferung", "newsletter", "partner-auftrag", "produkt", "suche", "ueber-uns",
  "vertrag-widerrufen", "warenkorb", "widerruf",
]);

const SEGMENT_TYPES: Record<string, PageType> = {
  produkt: "product",
  blumen: "category",
  anlaesse: "occasion",
  checkout: "checkout",
  kontakt: "contact",
  faq: "faq",
};

/**
 * Page type of a public URL path (any language), e.g. `/tr/urun/rose-dream` → "product".
 * The locale prefix is stripped and translated segments are mapped back to the German routes.
 */
export function pageTypeFromPath(pathname: string): PageType {
  const path = (pathname || "/").split(/[?#]/)[0] || "/";
  if (isUnprefixedSystemPath(path)) return "other";
  const resolved = resolvePublicPath(path);
  if (!resolved) return "other";
  const parts = stripLocale(resolved.internal).split("/").filter(Boolean);
  if (!parts.length) return "home";
  const type = SEGMENT_TYPES[parts[0]];
  if (type) return type;
  if (parts.length === 1 && !STATIC_SEGMENTS.has(parts[0])) return "landing";
  return "other";
}

export type ReviewPlatform = "trustpilot" | "google";

/** Classifies an outgoing link for whatsapp_clicked / review_clicked. */
export function classifyOutboundLink(href: string): { kind: "whatsapp" } | { kind: "review"; platform: ReviewPlatform } | null {
  let url: URL;
  try {
    url = new URL(href, "https://blumora.invalid");
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "wa.me" || host === "api.whatsapp.com") return { kind: "whatsapp" };
  if (host === "trustpilot.com" || host.endsWith(".trustpilot.com")) return { kind: "review", platform: "trustpilot" };
  if (host === "g.page") return { kind: "review", platform: "google" };
  if (host === "search.google.com" && url.pathname.startsWith("/local/writereview")) return { kind: "review", platform: "google" };
  if ((host === "google.com" || /^google\.[a-z.]+$/.test(host)) && url.pathname.startsWith("/maps")) return { kind: "review", platform: "google" };
  if (host === "maps.google.com" || host === "maps.app.goo.gl") return { kind: "review", platform: "google" };
  return null;
}

export interface FilterChange { filter_type: string; filter_value: string }

/**
 * Filters that were newly chosen between two shop states (removals are not reported).
 * Values are option ids/slugs; the postal code filter is reported as "set" only.
 */
export function filterChanges(prev: ShopParams, next: ShopParams): FilterChange[] {
  const out: FilterChange[] = [];
  const lists = ["anlass", "blume", "farbe", "groesse", "stil", "saison"] as const;
  for (const key of lists) {
    for (const value of next[key]) if (!prev[key].includes(value)) out.push({ filter_type: key, filter_value: value });
  }
  if (next.preis && next.preis !== prev.preis) out.push({ filter_type: "preis", filter_value: next.preis });
  if (next.sameday && !prev.sameday) out.push({ filter_type: "verfuegbarkeit", filter_value: "sameday" });
  if (next.lager && !prev.lager) out.push({ filter_type: "verfuegbarkeit", filter_value: "lager" });
  if (next.datum && next.datum !== prev.datum) out.push({ filter_type: "datum", filter_value: next.datum });
  if (next.plz && next.plz !== prev.plz) out.push({ filter_type: "plz", filter_value: "set" });
  if (next.sort !== prev.sort) out.push({ filter_type: "sort", filter_value: next.sort });
  return out;
}

/** Normalised key for "one search event per distinct query". */
export function searchQueryKey(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}
