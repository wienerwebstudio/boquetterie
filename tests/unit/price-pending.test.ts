import { describe, expect, it, vi } from "vitest";

// orders.ts is server code; its guard module only exists inside Next.
vi.mock("server-only", () => ({}));

import { applyFilter, isPricePending, matchesCategory, sortProducts } from "@/lib/catalog";
import { resolveLines } from "@/lib/orders";
import { productLd } from "@/lib/seo";
import type { Category, SiteSettings } from "@/types";
import { makeProduct } from "./fixtures";

const pending = makeProduct({ id: "p-pending", slug: "pending", pricePending: true, basePrice: 0, sizes: [{ id: "m", label: "Standard", price: 0 }] });
const cheap = makeProduct({ id: "p-cheap", slug: "cheap", basePrice: 30, sizes: [{ id: "m", label: "Mittel", price: 30 }] });
const dear = makeProduct({ id: "p-dear", slug: "dear", basePrice: 90, sizes: [{ id: "m", label: "Mittel", price: 90 }] });

describe("price pending", () => {
  it("flags only products with pricePending: true", () => {
    expect(isPricePending(pending)).toBe(true);
    expect(isPricePending(cheap)).toBe(false);
  });

  it("never lands in a price-based category or filter", () => {
    const unter40: Category = { slug: "unter-40", name: "Unter 40 €", headline: "", intro: "", rule: { maxPrice: 40 }, seo: { title: "", description: "" }, showInNav: true, sortOrder: 1 };
    expect(matchesCategory(pending, unter40)).toBe(false);
    expect(matchesCategory(cheap, unter40)).toBe(true);
    expect(applyFilter([pending, cheap, dear], { maxPrice: 50 }).map((p) => p.slug)).toEqual(["cheap"]);
    expect(applyFilter([pending, cheap], {}).map((p) => p.slug)).toEqual(["pending", "cheap"]);
  });

  it("sorts last in both price directions", () => {
    expect(sortProducts([pending, dear, cheap], "price-asc").map((p) => p.slug)).toEqual(["cheap", "dear", "pending"]);
    expect(sortProducts([pending, cheap, dear], "price-desc").map((p) => p.slug)).toEqual(["dear", "cheap", "pending"]);
  });

  it("is refused by the order resolver, priced products are not", () => {
    const item = (productId: string) => ({ productId, sizeId: "m" as const, quantity: 1, extras: [] });
    const refused = resolveLines([item("p-pending")], [pending, cheap], []);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.message).toMatch(/noch nicht bestellbar/);
    const accepted = resolveLines([item("p-cheap")], [pending, cheap], []);
    expect(accepted.ok).toBe(true);
    if (accepted.ok) expect(accepted.lines[0].line.unitPrice).toBe(30);
  });

  it("publishes no offer in structured data", () => {
    const settings = { seo: { siteUrl: "https://example.at" }, brand: { name: "Blumora" } } as unknown as SiteSettings;
    expect(productLd(pending, settings)).not.toHaveProperty("offers");
    expect(productLd(cheap, settings)).toHaveProperty("offers.lowPrice", "30.00");
  });
});
