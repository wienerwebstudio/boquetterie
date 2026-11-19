/**
 * Gift finder options – pure, shared by the client stepper, the server page and
 * the API route. Colors and styles are the slugs used in content/products.json
 * (see COLOR_OPTIONS / STYLE_OPTIONS in src/lib/catalog.ts).
 */

export const GIFT_FINDER_PATH = "/geschenkfinder";

export type ForValue = "partner" | "mama" | "freundin" | "kollegin" | "familie" | "selbst";

/** Labels and hints (a short, honest description of the taste profile) live in `shop.giftFinder.forOptions`. */
export interface ForOption {
  value: ForValue;
  colors: string[];
  styles: string[];
}

export const FOR_OPTIONS: ForOption[] = [
  { value: "partner", colors: ["rot", "rosa", "burgund"], styles: ["romantisch", "elegant"] },
  { value: "mama", colors: ["rosa", "creme", "lila"], styles: ["klassisch", "romantisch", "natuerlich"] },
  { value: "freundin", colors: ["gelb", "orange", "rosa"], styles: ["froehlich", "wild", "natuerlich"] },
  { value: "kollegin", colors: ["weiss", "creme", "gruen"], styles: ["elegant", "modern"] },
  { value: "familie", colors: ["creme", "beige", "gelb", "orange"], styles: ["klassisch", "natuerlich", "froehlich"] },
  { value: "selbst", colors: ["lila", "gruen", "orange", "burgund"], styles: ["modern", "wild", "natuerlich"] },
];

export type BudgetValue = "bis-40" | "40-60" | "60-90" | "ab-90";

/** Labels and hints live in `shop.giftFinder.budgets`. */
export interface BudgetOption {
  value: BudgetValue;
  min: number;
  /** null = open end */
  max: number | null;
}

export const BUDGET_OPTIONS: BudgetOption[] = [
  { value: "bis-40", min: 0, max: 40 },
  { value: "40-60", min: 40, max: 60 },
  { value: "60-90", min: 60, max: 90 },
  { value: "ab-90", min: 90, max: null },
];

export const forOption = (value: string | null | undefined) => FOR_OPTIONS.find((o) => o.value === value) ?? null;
export const budgetOption = (value: string | null | undefined) => BUDGET_OPTIONS.find((o) => o.value === value) ?? null;

/** Builds the shareable URL – only set values are included. */
export function giftFinderUrl(q: { for?: string | null; occasion?: string | null; budget?: string | null }) {
  const sp = new URLSearchParams();
  if (q.for) sp.set("for", q.for);
  if (q.occasion) sp.set("occasion", q.occasion);
  if (q.budget) sp.set("budget", q.budget);
  const s = sp.toString();
  return s ? `${GIFT_FINDER_PATH}?${s}` : GIFT_FINDER_PATH;
}
