import { describe, expect, it } from "vitest";
import { localizeReview, reviewTextKey } from "@/lib/review-translations";
import type { Review } from "@/types";

const review: Review = { id: "r1", name: "Martin K.", rating: 5, text: "Schöner als das Foto!", verified: true, date: "2026-11-17", demo: false };
const t = { [reviewTextKey(review.text)]: { lang: "de", texts: { en: "Nicer than the photo!" } } };

describe("review translations", () => {
  it("keys ignore whitespace differences", () => {
    expect(reviewTextKey("  Schöner als  das\nFoto! ")).toBe(reviewTextKey("Schöner als das Foto!"));
  });
  it("shows the translation with the original attached", () => {
    const r = localizeReview(review, "en", t);
    expect(r.text).toBe("Nicer than the photo!");
    expect(r.display).toEqual({ lang: "de", translated: true, original: "Schöner als das Foto!" });
  });
  it("shows the original, marked, when there is no translation", () => {
    const r = localizeReview(review, "tr", t);
    expect(r.text).toBe(review.text);
    expect(r.display).toEqual({ lang: "de", translated: false, original: review.text });
  });
  it("leaves reviews alone in their own language", () => {
    expect(localizeReview(review, "de", t).display).toBeUndefined();
    expect(localizeReview({ ...review, lang: "tr" }, "tr", t).display).toBeUndefined();
  });
  it("an edited review no longer matches its old translation", () => {
    expect(localizeReview({ ...review, text: "Anderer Text" }, "en", t).display?.translated).toBe(false);
  });
});

describe("admin translations on the review", () => {
  const base = { id: "r-uk", name: "Олена", rating: 5 as const, text: "Дуже гарний букет!", verified: true, date: "2026-11-20", demo: false, lang: "uk",
    translations: { de: "Sehr schöner Strauß!", en: "", tr: "  " } };

  it("original language page: original text, no note", () => {
    const r = localizeReview(base, "uk");
    expect(r.text).toBe("Дуже гарний букет!");
    expect(r.display).toBeUndefined();
  });

  it("other pages: translation with 'translated from Ukrainian' and the original", () => {
    const r = localizeReview(base, "de");
    expect(r.text).toBe("Sehr schöner Strauß!");
    expect(r.display).toEqual({ lang: "uk", translated: true, original: "Дуже гарний букет!" });
  });

  it("empty translation fields fall back to the original with the language note", () => {
    for (const l of ["en", "tr", "fr"]) {
      const r = localizeReview(base, l);
      expect(r.text).toBe("Дуже гарний букет!");
      expect(r.display).toEqual({ lang: "uk", translated: false, original: "Дуже гарний букет!" });
    }
  });

  it("admin translation wins over the shared translation document", () => {
    const doc = { [reviewTextKey(base.text)]: { lang: "uk", texts: { de: "Alt" } } };
    expect(localizeReview(base, "de", doc).text).toBe("Sehr schöner Strauß!");
  });
});
