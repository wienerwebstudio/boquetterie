/**
 * Gift finder options – pure, shared by the client stepper, the server page and
 * the API route. Colors and styles are the slugs used in content/products.json
 * (see COLOR_OPTIONS / STYLE_OPTIONS in src/lib/catalog.ts).
 */

export const GIFT_FINDER_PATH = "/geschenkfinder";

export type ForValue = "partner" | "mama" | "freundin" | "kollegin" | "familie" | "selbst";

export interface ForOption {
  value: ForValue;
  label: string;
  /** Short, honest description of the taste profile behind the mapping. */
  hint: string;
  colors: string[];
  styles: string[];
}

export const FOR_OPTIONS: ForOption[] = [
  { value: "partner", label: "Partner:in", hint: "Romantisch & ausdrucksstark", colors: ["rot", "rosa", "burgund"], styles: ["romantisch", "elegant"] },
  { value: "mama", label: "Mama", hint: "Weich & klassisch", colors: ["rosa", "creme", "lila"], styles: ["klassisch", "romantisch", "natuerlich"] },
  { value: "freundin", label: "Freund:in", hint: "Fröhlich & unkompliziert", colors: ["gelb", "orange", "rosa"], styles: ["froehlich", "wild", "natuerlich"] },
  { value: "kollegin", label: "Kolleg:in", hint: "Elegant & dezent", colors: ["weiss", "creme", "gruen"], styles: ["elegant", "modern"] },
  { value: "familie", label: "Familie", hint: "Warm & vertraut", colors: ["creme", "beige", "gelb", "orange"], styles: ["klassisch", "natuerlich", "froehlich"] },
  { value: "selbst", label: "Mich selbst", hint: "Modern & eigenwillig", colors: ["lila", "gruen", "orange", "burgund"], styles: ["modern", "wild", "natuerlich"] },
];

export type BudgetValue = "bis-40" | "40-60" | "60-90" | "ab-90";

export interface BudgetOption {
  value: BudgetValue;
  label: string;
  hint: string;
  min: number;
  /** null = open end */
  max: number | null;
}

export const BUDGET_OPTIONS: BudgetOption[] = [
  { value: "bis-40", label: "bis 40 €", hint: "Kleine Aufmerksamkeit", min: 0, max: 40 },
  { value: "40-60", label: "40–60 €", hint: "Der Klassiker", min: 40, max: 60 },
  { value: "60-90", label: "60–90 €", hint: "Großzügig", min: 60, max: 90 },
  { value: "ab-90", label: "ab 90 €", hint: "Ganz groß", min: 90, max: null },
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
