import { describe, expect, it } from "vitest";
import type { CmsPage, DeliveryZone, Extra, FAQ, LandingPage, Occasion, Review, SiteSettings } from "@/types";
import { buildLlmsFull, buildLlmsTxt, type LlmsData } from "@/lib/llms";
import { categories, products, zones } from "./fixtures";
import settingsJson from "../../content/settings.json";
import occasionsJson from "../../content/occasions.json";
import faqsJson from "../../content/faqs.json";
import extrasJson from "../../content/extras.json";
import landingJson from "../../content/landing-pages.json";
import pagesJson from "../../content/pages.json";

const settings = { ...(settingsJson as unknown as SiteSettings) };
const review = (over: Partial<Review>): Review => ({ id: "r", name: "Anna M.", rating: 5, text: "Wunderschön.", verified: true, demo: false, date: "2026-11-16", ...over });

function data(over: Partial<LlmsData> = {}): LlmsData {
  return {
    settings, products, categories, zones: zones as DeliveryZone[],
    occasions: occasionsJson as Occasion[], faqs: faqsJson as FAQ[], extras: extrasJson as Extra[],
    landingPages: landingJson as LandingPage[], pages: pagesJson as CmsPage[],
    reviews: [review({}), review({ id: "d", name: "Demo", demo: true }), review({ id: "u", name: "Unverified", verified: false })],
    ...over,
  };
}

describe("llms.txt", () => {
  it("has the llmstxt.org shape and links the full file", () => {
    const txt = buildLlmsTxt(data());
    expect(txt.startsWith(`# ${settings.brand.name}\n\n> `)).toBe(true);
    expect(txt).toContain("/llms-full.txt");
    expect(txt).toMatch(/Same-Day/);
  });
});

describe("llms-full.txt", () => {
  const full = buildLlmsFull(data());

  it("lists every active product with its URL and prices", () => {
    for (const p of products.filter((x) => x.active)) {
      expect(full).toContain(`### ${p.name}`);
      expect(full).toContain(`/produkt/${p.slug}`);
    }
    expect(full).not.toMatch(/inkl\. USt|inklusive Umsatzsteuer/);
  });

  it("lists postal codes, FAQ and only verified, real reviews", () => {
    expect(full).toContain("Postleitzahlen: ");
    expect(full).toContain(`### ${(faqsJson as FAQ[])[0].question.trim()}`);
    expect(full).toContain("Anna M.");
    expect(full).not.toContain("Demo,");
    expect(full).not.toContain("Unverified");
  });

  it("never leaks placeholders, partner or budget data", () => {
    expect(full).not.toMatch(/\[[^\]]*\](?!\()/);
    expect(full).not.toMatch(/Budget|Einkauf|Dody/i);
    const withPlaceholder = buildLlmsFull(data({ settings: { ...settings, brand: { ...settings.brand, phone: "[Telefon]" } } }));
    expect(withPlaceholder).not.toContain("[Telefon]");
  });
});
