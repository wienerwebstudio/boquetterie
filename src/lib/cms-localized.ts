import "server-only";
import { cache } from "react";
/**
 * CMS content in the visitor's language: the German documents merged with the
 * translations from `i18n-{locale}` (see src/lib/i18n-content.ts). Same shapes as
 * the German getters in cms.ts – pages swap `getAllProducts()` for
 * `getProductsIn(locale)` etc. German needs no translation document.
 */
import {
  getAllProducts, getCategories, getDeliveryZones, getExtras, getFaqs, getHomepage, getOccasions, getPages,
  getReviews, getSettings, readCollection,
} from "@/lib/cms";
import { localizeReview, type ReviewTranslations } from "@/lib/review-translations";
import {
  localizeCategory, localizeExtra, localizeFaq, localizeHomepage, localizeOccasion, localizePage, localizeProduct,
  localizeSettings, localizeZone, type ContentTranslations,
} from "@/lib/i18n-content";
import type { Locale } from "@/i18n/config";

/** Translation document of a language; `undefined` for German or when none exists yet. Read once per request. */
export const getContentTranslations = cache(async (locale: Locale): Promise<ContentTranslations | undefined> => {
  if (locale === "de") return undefined;
  try {
    return await readCollection<ContentTranslations>(`i18n-${locale}`);
  } catch {
    return undefined;
  }
});

export async function getProductsIn(locale: Locale, includeInactive = false) {
  const [list, t] = await Promise.all([getAllProducts(includeInactive), getContentTranslations(locale)]);
  return t ? list.map((p) => localizeProduct(p, t)) : list;
}
export async function getProductIn(locale: Locale, slug: string) {
  return (await getProductsIn(locale)).find((p) => p.slug === slug) ?? null;
}
export async function getCategoriesIn(locale: Locale) {
  const [list, t] = await Promise.all([getCategories(), getContentTranslations(locale)]);
  return t ? list.map((c) => localizeCategory(c, t)) : list;
}
export async function getOccasionsIn(locale: Locale) {
  const [list, t] = await Promise.all([getOccasions(), getContentTranslations(locale)]);
  return t ? list.map((o) => localizeOccasion(o, t)) : list;
}
export async function getExtrasIn(locale: Locale, onlyActive = true) {
  const [list, t] = await Promise.all([getExtras(onlyActive), getContentTranslations(locale)]);
  return t ? list.map((e) => localizeExtra(e, t)) : list;
}
export async function getFaqsIn(locale: Locale) {
  const [list, t] = await Promise.all([getFaqs(), getContentTranslations(locale)]);
  return t ? list.map((f) => localizeFaq(f, t)) : list;
}
export async function getFaqsByIdsIn(locale: Locale, ids: string[]) {
  const all = await getFaqsIn(locale);
  return ids.map((id) => all.find((f) => f.id === id)).filter((f): f is NonNullable<typeof f> => Boolean(f));
}
export async function getPageIn(locale: Locale, slug: string) {
  const [pages, t] = await Promise.all([getPages(), getContentTranslations(locale)]);
  const page = pages.find((p) => p.slug === slug) ?? null;
  return page && t ? localizePage(page, t) : page;
}
export async function getHomepageIn(locale: Locale) {
  const [h, t] = await Promise.all([getHomepage(), getContentTranslations(locale)]);
  return localizeHomepage(h, t);
}
export async function getSettingsIn(locale: Locale) {
  const [s, t] = await Promise.all([getSettings(), getContentTranslations(locale)]);
  return localizeSettings(s, t);
}
export async function getDeliveryZonesIn(locale: Locale, onlyActive = true) {
  const [list, t] = await Promise.all([getDeliveryZones(onlyActive), getContentTranslations(locale)]);
  return t ? list.map((z) => localizeZone(z, t)) : list;
}

/** Review translations (one document for all languages); `undefined` when none exist. Read once per request. */
const getReviewTranslations = cache(async (): Promise<ReviewTranslations | undefined> => {
  try {
    return await readCollection<ReviewTranslations>("review-translations");
  } catch {
    return undefined;
  }
});

/** Reviews in the visitor's language – translated text with `display` marking it (see review-translations.ts). */
export async function getReviewsIn(locale: Locale) {
  const [list, t] = await Promise.all([getReviews(), getReviewTranslations()]);
  return list.map((r) => localizeReview(r, locale, t));
}
