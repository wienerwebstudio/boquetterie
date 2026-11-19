import "server-only";
/**
 * Storefront content in the language of the current request – same names and
 * shapes as the getters in cms.ts, so pages and components just import from
 * here instead. German texts are replaced by the translations (cms-localized.ts);
 * prices, ids, slugs and images always stay the German data.
 *
 * Uses `next/root-params`, so only in Server Components of app/[locale]. Route
 * handlers pass a locale to the `…In(locale)` functions in cms-localized.ts.
 */
import type { Product } from "@/types";
import { currentLocale } from "@/i18n/server";
import {
  getCategoriesIn, getDeliveryZonesIn, getExtrasIn, getFaqsByIdsIn, getFaqsIn, getHomepageIn, getOccasionsIn,
  getPageIn, getProductsIn, getSettingsIn,
} from "@/lib/cms-localized";

export {
  getSubscription, getReviews, getLandingPages, getLandingPageBySlug, getOrderById, getOrdersByEmail, getCoupons,
} from "@/lib/cms";

export const getSettings = async () => getSettingsIn(await currentLocale());
export const getHomepage = async () => getHomepageIn(await currentLocale());
export const getOccasions = async () => getOccasionsIn(await currentLocale());
export const getCategories = async () => getCategoriesIn(await currentLocale());
export const getExtras = async (onlyActive = true) => getExtrasIn(await currentLocale(), onlyActive);
export const getDeliveryZones = async (onlyActive = true) => getDeliveryZonesIn(await currentLocale(), onlyActive);
export const getFaqs = async () => getFaqsIn(await currentLocale());
export const getFaqsByIds = async (ids: string[]) => getFaqsByIdsIn(await currentLocale(), ids);
export const getPageBySlug = async (slug: string) => getPageIn(await currentLocale(), slug);
export const getAllProducts = async (includeInactive = false) => getProductsIn(await currentLocale(), includeInactive);

export async function getProductBySlug(slug: string) {
  return (await getAllProducts()).find((p) => p.slug === slug) ?? null;
}
export async function getProductsBySlugs(slugs: string[]) {
  const all = await getAllProducts();
  return slugs.map((s) => all.find((p) => p.slug === s)).filter((p): p is Product => Boolean(p));
}
export async function getOccasionBySlug(slug: string) {
  return (await getOccasions()).find((o) => o.slug === slug) ?? null;
}
export async function getCategoryBySlug(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug) ?? null;
}
