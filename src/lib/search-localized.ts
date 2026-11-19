import "server-only";
import type { Locale } from "@/i18n/config";
import { search, type SearchResult } from "@/lib/catalog";
import { getCategoriesIn, getOccasionsIn, getProductsIn } from "@/lib/cms-localized";

/**
 * Search in a language: the translated texts first, then hits from the German texts
 * (tags, synonyms and German words keep working), always returned in the visitor's
 * language. German simply searches the German content.
 */
export async function searchIn(locale: Locale, q: string, limit: number): Promise<SearchResult> {
  const [products, occasions, categories] = await Promise.all([getProductsIn(locale), getOccasionsIn(locale), getCategoriesIn(locale)]);
  const result = search(q, products, occasions, categories, limit);
  if (locale === "de") return result;
  const [deProducts, deOccasions, deCategories] = await Promise.all([getProductsIn("de"), getOccasionsIn("de"), getCategoriesIn("de")]);
  const german = search(q, deProducts, deOccasions, deCategories, limit);
  const merge = <T,>(a: T[], b: T[], key: (x: T) => string, all: T[], max: number) => {
    const seen = new Set(a.map(key));
    const extra = b.map((x) => all.find((y) => key(y) === key(x))).filter((x): x is T => x !== undefined && !seen.has(key(x)));
    return [...a, ...extra].slice(0, max);
  };
  return {
    products: merge(result.products, german.products, (p) => p.id, products, limit),
    occasions: merge(result.occasions, german.occasions, (o) => o.slug, occasions, 4),
    categories: merge(result.categories, german.categories, (c) => c.slug, categories, 4),
  };
}
