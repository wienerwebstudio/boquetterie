/**
 * Gift finder matching – pure and isomorphic (used by the API route and the page).
 *
 * Budget is a hard filter (any size of the product must be priced within the range).
 * Then: occasion match +3, each preferred color +1, each preferred style +1.
 * Ties keep the bestseller/sort order from `sortProducts`. If fewer than
 * MIN_RESULTS remain, the list is padded with bestsellers and flagged as fallback.
 */
import type { Occasion, Product } from "@/types";
import { applyFilter, sortProducts } from "@/lib/catalog";
import { budgetOption, BUDGET_OPTIONS, FOR_OPTIONS, forOption, type BudgetValue, type ForValue } from "./config";

export const RESULT_LIMIT = 6;
export const MIN_RESULTS = 3;

export interface GiftFinderQuery {
  for: ForValue | null;
  occasion: string | null;
  budget: BudgetValue | null;
}
export type CompleteGiftFinderQuery = { [K in keyof GiftFinderQuery]: NonNullable<GiftFinderQuery[K]> };

export interface GiftFinderResult {
  products: Product[];
  /** True when bestsellers had to fill up the list. */
  fallback: boolean;
  /** How many of the returned products actually carry the chosen occasion. */
  occasionHits: number;
}

type ParamValue = string | string[] | undefined;
const first = (v: ParamValue) => (Array.isArray(v) ? v[0] : v) ?? null;

/** Validates raw search params against the known options and occasions. Unknown values become null. */
export function parseGiftFinderQuery(params: Record<string, ParamValue>, occasions: Pick<Occasion, "slug">[]): GiftFinderQuery {
  const f = first(params.for);
  const o = first(params.occasion);
  const b = first(params.budget);
  return {
    for: FOR_OPTIONS.some((x) => x.value === f) ? (f as ForValue) : null,
    occasion: o && occasions.some((x) => x.slug === o) ? o : null,
    budget: BUDGET_OPTIONS.some((x) => x.value === b) ? (b as BudgetValue) : null,
  };
}

export function isComplete(q: GiftFinderQuery): q is CompleteGiftFinderQuery {
  return Boolean(q.for && q.occasion && q.budget);
}

export function findGifts(products: Product[], query: GiftFinderQuery): GiftFinderResult {
  const budget = budgetOption(query.budget);
  const who = forOption(query.for);
  const base = sortProducts(applyFilter(products, { inStockOnly: true }), "bestseller");

  const inBudget = budget
    ? base.filter((p) => p.sizes.some((s) => s.price >= budget.min && (budget.max === null || s.price <= budget.max)))
    : base;

  const scored = inBudget.map((p) => {
    const occasion = query.occasion && p.occasions.includes(query.occasion) ? 3 : 0;
    const colors = who ? who.colors.filter((c) => p.colors.includes(c)).length : 0;
    const styles = who ? who.styles.filter((s) => p.styles.includes(s)).length : 0;
    return { p, score: occasion + colors + styles, occasion: occasion > 0 };
  });
  scored.sort((a, b) => b.score - a.score); // stable → keeps bestseller order on ties

  const picks = scored.slice(0, RESULT_LIMIT);
  const result: Product[] = picks.map((x) => x.p);
  const occasionHits = picks.filter((x) => x.occasion).length;
  let fallback = false;

  if (result.length < MIN_RESULTS) {
    fallback = true;
    const seen = new Set(result.map((p) => p.id));
    const fill = [...base.filter((p) => p.bestseller), ...base];
    for (const p of fill) {
      if (result.length >= RESULT_LIMIT) break;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      result.push(p);
    }
  }

  return { products: result, fallback, occasionHits };
}
