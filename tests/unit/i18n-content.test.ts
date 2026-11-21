import { describe, expect, it } from "vitest";
import type { HomepageContent, SiteSettings } from "@/types";
import { localizeHomepage, localizeProduct, localizeSettings, type ContentTranslations } from "@/lib/i18n-content";
import { products } from "./fixtures";
import homepageJson from "../../content/homepage.json";
import settingsJson from "../../content/settings.json";

const p = products.find((x) => x.active && x.sizes.length > 1)!;

describe("content translations", () => {
  it("replaces texts but never prices, slugs or images", () => {
    const t: ContentTranslations = { products: { [p.id]: { name: "Translated", tagline: "", sizes: { [p.sizes[0].id]: { label: "Small" } }, imageAlts: { [p.images[0].src]: "Alt EN" } } } };
    const out = localizeProduct(p, t);
    expect(out.name).toBe("Translated");
    expect(out.tagline).toBe(p.tagline); // empty → German
    expect(out.sizes[0].label).toBe("Small");
    expect(out.sizes.map((s) => s.price)).toEqual(p.sizes.map((s) => s.price));
    expect(out.slug).toBe(p.slug);
    expect(out.images[0]).toEqual({ ...p.images[0], alt: "Alt EN" });
  });

  it("keeps German lists when a translated list has a different length", () => {
    const out = localizeProduct(p, { products: { [p.id]: { flowers: ["only one"] } } });
    expect(out.flowers).toEqual(p.flowers.length === 1 ? ["only one"] : p.flowers);
  });

  it("merges homepage texts but keeps links, images and slug lists", () => {
    const h = homepageJson as unknown as HomepageContent;
    const out = localizeHomepage(h, { homepage: { hero: { headline: "Flowers that say more", primaryCta: { label: "Shop", href: "/evil" }, imageWide: "/x.jpg" }, occasions: { slugs: ["x"] } } as never });
    expect(out.hero.headline).toBe("Flowers that say more");
    expect(out.hero.primaryCta).toEqual({ ...h.hero.primaryCta, label: "Shop" });
    expect(out.hero.imageWide).toBe(h.hero.imageWide);
    expect(out.occasions.slugs).toEqual(h.occasions.slugs);
  });

  it("translates order status and payment labels by key", () => {
    const s = settingsJson as unknown as SiteSettings;
    const st = s.orderStatuses[0];
    const out = localizeSettings(s, { settings: { orderStatuses: { [st.key]: { label: "Received" } }, payments: { card: "Credit card" } } });
    expect(out.orderStatuses[0].label).toBe("Received");
    expect(out.orderStatuses[0].description).toBe(st.description);
    expect(out.payments.find((x) => x.id === "card")?.label).toBe("Credit card");
    expect(out.payments.map((x) => x.enabled)).toEqual(s.payments.map((x) => x.enabled));
  });
});
