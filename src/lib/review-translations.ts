/**
 * Translations of customer reviews. Stored in the content document
 * `review-translations` (content/review-translations.json until edited):
 *
 *   { "<key of the original text>": { "lang": "de", "texts": { "en": "…", "tr": "…" } } }
 *
 * The key is a hash of the original text, so a translation only applies while the
 * review text is unchanged – an edited review falls back to its original text.
 * Translations are always shown with a note ("Übersetzt aus: Deutsch") and the original
 * one click away. Pure; the hash uses node:crypto (server only).
 */
import { createHash } from "node:crypto";
import type { Review } from "@/types";

export type ReviewTranslations = Record<string, { lang?: string; texts: Record<string, string> }>;

/** Stable key of a review text (whitespace-normalized SHA-1, 12 hex chars). */
export function reviewTextKey(text: string) {
  return createHash("sha1").update(text.replace(/\s+/g, " ").trim().normalize("NFC")).digest("hex").slice(0, 12);
}

/** The review as shown in `locale`: translated text where available, else the original – both marked via `display`. */
export function localizeReview(review: Review, locale: string, translations?: ReviewTranslations): Review {
  const entry = translations?.[reviewTextKey(review.text)];
  const lang = review.lang ?? entry?.lang ?? "de";
  if (lang === locale) return review;
  const text = entry?.texts[locale]?.trim();
  return text
    ? { ...review, text, display: { lang, translated: true, original: review.text } }
    : { ...review, display: { lang, translated: false, original: review.text } };
}
