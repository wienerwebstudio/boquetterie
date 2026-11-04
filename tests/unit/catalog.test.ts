import { describe, expect, it } from "vitest";
import {
  applyFilter, flowerFamily, lowestPrice, matchesCategory, productBadges, productFlowerFamilies, scoreProduct, search, sortProducts,
} from "@/lib/catalog";
import { categories, categoryBySlug, makeProduct, occasions, productBySlug, products } from "./fixtures";

const slugs = (list: { slug: string }[]) => list.map((p) => p.slug);

describe("applyFilter", () => {
  it("returns every active product without filters", () => {
    expect(applyFilter(products, {})).toHaveLength(products.filter((p) => p.active).length);
    const withInactive = [...products, makeProduct({ active: false })];
    expect(slugs(applyFilter(withInactive, {}))).not.toContain("test");
  });

  it("filters by colour (any of the selected)", () => {
    const rosa = applyFilter(products, { colors: ["rosa"] });
    expect(rosa.length).toBeGreaterThan(0);
    expect(rosa.every((p) => p.colors.includes("rosa"))).toBe(true);
    expect(slugs(rosa)).toContain("blush");
    expect(slugs(rosa)).not.toContain("amour");

    const rotOrGelb = applyFilter(products, { colors: ["rot", "gelb"] });
    expect(rotOrGelb.every((p) => p.colors.includes("rot") || p.colors.includes("gelb"))).toBe(true);
    expect(slugs(rotOrGelb)).toEqual(expect.arrayContaining(["amour", "solstice", "noir"]));
  });

  it("combines filters with AND across dimensions", () => {
    const list = applyFilter(products, { colors: ["rosa"], occasions: ["geburtstag"], styles: ["romantisch"] });
    expect(list.every((p) => p.colors.includes("rosa") && p.occasions.includes("geburtstag") && p.styles.includes("romantisch"))).toBe(true);
    expect(slugs(list)).toContain("blush");
    expect(slugs(list)).not.toContain("sakura"); // rosa + geburtstag but not romantisch
  });

  it("filters by size, flower family and season", () => {
    expect(slugs(applyFilter(products, { sizes: ["l"] }))).not.toContain("petit"); // Petit only comes in S/M
    expect(slugs(applyFilter(products, { sizes: ["s"] }))).toContain("petit");
    const rosen = applyFilter(products, { flowers: ["rosen"] });
    expect(slugs(rosen)).toEqual(expect.arrayContaining(["amour", "ivory", "rose-garden"]));
    expect(rosen.every((p) => productFlowerFamilies(p).includes("rosen"))).toBe(true);
    expect(slugs(applyFilter(products, { flowers: ["lavendel"] }))).toEqual(["lavande"]);
    expect(applyFilter(products, { seasons: ["winter"] }).every((p) => p.seasons.includes("winter"))).toBe(true);
  });

  it("filters by price range (basePrice, inclusive bounds)", () => {
    const cheap = applyFilter(products, { maxPrice: 40 });
    expect(cheap.every((p) => p.basePrice <= 40)).toBe(true);
    expect(slugs(cheap)).toEqual(expect.arrayContaining(["petit", "lavande", "sakura", "solstice", "toscana"]));
    const mid = applyFilter(products, { minPrice: 40, maxPrice: 60 });
    expect(mid.every((p) => p.basePrice >= 40 && p.basePrice <= 60)).toBe(true);
    expect(slugs(mid)).not.toContain("petit");
    expect(applyFilter(products, { minPrice: 1000 })).toEqual([]);
  });

  it("sameDayOnly and inStockOnly", () => {
    const sameDay = applyFilter(products, { sameDayOnly: true });
    expect(sameDay.every((p) => p.sameDayCapable)).toBe(true);
    expect(slugs(sameDay)).not.toContain("blush");
    expect(slugs(sameDay)).not.toContain("noir");

    const withSoldOut = [...products, makeProduct({ stock: 0 }), makeProduct({ id: "p-limited", slug: "limited", stock: 3 })];
    const inStock = applyFilter(withSoldOut, { inStockOnly: true });
    expect(slugs(inStock)).not.toContain("test");
    expect(slugs(inStock)).toContain("limited");
    expect(slugs(applyFilter(withSoldOut, {}))).toContain("test"); // sold-out products stay listed without the filter
  });

  it("applies category rules and free-text queries", () => {
    expect(slugs(applyFilter(products, { category: "unter-40" }, categories)).every((s) => productBySlug(s).basePrice <= 40)).toBe(true);
    expect(applyFilter(products, { category: "does-not-exist" }, categories)).toHaveLength(products.length); // unknown category → no restriction
    const q = applyFilter(products, { query: "lavendel" });
    expect(slugs(q)).toContain("lavande");
    expect(applyFilter(products, { query: "xyzzy" })).toEqual([]);
  });
});

describe("matchesCategory", () => {
  it("'alle' matches everything", () => {
    expect(products.every((p) => matchesCategory(p, categoryBySlug("alle")))).toBe(true);
  });

  it("'unter-40' is a price rule", () => {
    const cat = categoryBySlug("unter-40");
    expect(matchesCategory(productBySlug("petit"), cat)).toBe(true);
    expect(matchesCategory(productBySlug("solstice"), cat)).toBe(true); // 39.9 ≤ 40
    expect(matchesCategory(productBySlug("amour"), cat)).toBe(false); // 44.9
    expect(matchesCategory(makeProduct({ basePrice: 40 }), cat)).toBe(true);
    expect(matchesCategory(makeProduct({ basePrice: 40.01 }), cat)).toBe(false);
  });

  it("'bestseller' and 'neu' are flag rules", () => {
    expect(matchesCategory(productBySlug("amour"), categoryBySlug("bestseller"))).toBe(true);
    expect(matchesCategory(productBySlug("noir"), categoryBySlug("bestseller"))).toBe(false);
    expect(matchesCategory(productBySlug("noir"), categoryBySlug("neu"))).toBe(true);
    expect(matchesCategory(productBySlug("amour"), categoryBySlug("neu"))).toBe(false);
  });

  it("direct category, categorySlugs and tags all grant membership", () => {
    const rosen = categoryBySlug("rosen");
    expect(matchesCategory(productBySlug("amour"), rosen)).toBe(true); // product.category
    expect(matchesCategory(productBySlug("ivory"), rosen)).toBe(true); // tag "rosen"
    expect(matchesCategory(productBySlug("toscana"), rosen)).toBe(false);
  });

  it("a colour rule requires every listed colour", () => {
    const pastell = categoryBySlug("pastell"); // colors: rosa, creme, lila
    expect(matchesCategory(makeProduct({ category: "x", tags: [], colors: ["rosa", "creme", "lila", "weiss"] }), pastell)).toBe(true);
    expect(matchesCategory(makeProduct({ category: "x", tags: [], colors: ["rosa", "creme"] }), pastell)).toBe(false);
    expect(matchesCategory(productBySlug("blush"), pastell)).toBe(true); // via category slug
  });

  it("style rules only apply when the category has no explicit slug list", () => {
    const bunt = categoryBySlug("bunt"); // categorySlugs + styles: froehlich
    expect(matchesCategory(makeProduct({ category: "x", tags: [], colors: [], styles: ["froehlich"] }), bunt)).toBe(false);
    const stylesOnly = { ...bunt, rule: { styles: ["froehlich"] } };
    expect(matchesCategory(makeProduct({ category: "x", tags: [], colors: [], styles: ["froehlich"] }), stylesOnly)).toBe(true);
  });
});

describe("sortProducts", () => {
  it("sorts by price in both directions without mutating the input", () => {
    const copy = [...products];
    const asc = sortProducts(products, "price-asc");
    expect(asc[0].slug).toBe("petit");
    expect(asc.at(-1)?.slug).toBe("noir");
    expect(sortProducts(products, "price-desc")[0].slug).toBe("noir");
    expect(products).toEqual(copy);
  });

  it("puts new / bestseller products first, then keeps the editorial order", () => {
    const fresh = sortProducts(products, "new");
    const firstOld = fresh.findIndex((p) => !p.isNew);
    expect(fresh.slice(0, firstOld).every((p) => p.isNew)).toBe(true);
    expect(fresh.slice(firstOld).some((p) => p.isNew)).toBe(false);
    expect(fresh[0].slug).toBe("toscana"); // lowest sortOrder among the new ones

    const best = sortProducts(products, "bestseller");
    expect(best[0].slug).toBe("amour");
    expect(best.filter((p) => p.bestseller).length).toBe(products.filter((p) => p.bestseller).length);
  });

  it("'recommended' follows sortOrder", () => {
    const rec = sortProducts([...products].reverse(), "recommended");
    expect(rec.map((p) => p.sortOrder)).toEqual([...rec.map((p) => p.sortOrder)].sort((a, b) => (a ?? 0) - (b ?? 0)));
  });
});

describe("search & scoring", () => {
  it("'mama' expands to Muttertag/Danke synonyms and returns products plus the Danke occasion", () => {
    const r = search("mama", products, occasions, categories);
    expect(r.products.length).toBeGreaterThan(0);
    expect(slugs(r.products)).toEqual(expect.arrayContaining(["blush", "sakura", "rose-garden"]));
    expect(r.occasions.map((o) => o.slug)).toContain("danke");
  });

  it("is case- and accent-insensitive", () => {
    const upper = search("MAMA", products, occasions, categories);
    const lower = search("mama", products, occasions, categories);
    expect(slugs(upper.products)).toEqual(slugs(lower.products));
    expect(scoreProduct(productBySlug("ivory"), "weiß")).toBe(scoreProduct(productBySlug("ivory"), "weiss"));
  });

  it("ignores queries shorter than two characters and respects the limit", () => {
    expect(search("m", products, occasions, categories)).toEqual({ products: [], occasions: [], categories: [] });
    expect(search("rosen", products, occasions, categories, 2).products).toHaveLength(2);
  });

  it("ranks exact name matches highest", () => {
    expect(search("amour", products, occasions, categories).products[0].slug).toBe("amour");
    expect(search("rot", products, occasions, categories).products[0].slug).toBe("amour"); // synonym rot → amour
    expect(scoreProduct(productBySlug("amour"), "amour")).toBeGreaterThanOrEqual(10);
    expect(scoreProduct(productBySlug("amour"), "zzzz")).toBe(0);
    expect(scoreProduct(productBySlug("amour"), "   ")).toBe(0);
  });

  it("'heute' finds same-day capable products and matches collections by name", () => {
    const r = search("heute", products, occasions, categories);
    expect(r.products.every((p) => p.sameDayCapable)).toBe(true);
    expect(search("rosen", products, occasions, categories).categories.map((c) => c.slug)).toContain("rosen");
  });
});

describe("small helpers", () => {
  it("flowerFamily / productFlowerFamilies", () => {
    expect(flowerFamily("Gartenrosen (rot)")).toBe("rosen");
    expect(flowerFamily("Pfingstrosen (rosé)")).toBe("rosen"); // "rose" is matched first – documented behaviour
    expect(flowerFamily("Tulpen (rosa)")).toBe("tulpen");
    expect(flowerFamily("Craspedia")).toBeNull();
    expect(productFlowerFamilies(productBySlug("amour"))).toEqual(["rosen", "eukalyptus"]);
  });

  it("lowestPrice and badges", () => {
    expect(lowestPrice(productBySlug("amour"))).toBe(44.9);
    expect(productBadges(productBySlug("amour")).map((b) => b.kind)).toEqual(["bestseller"]);
    expect(productBadges(productBySlug("toscana")).map((b) => b.kind)).toEqual(["new"]); // new beats seasonal
    expect(productBadges(productBySlug("petit")).map((b) => b.kind)).toEqual(["bestseller", "seasonal"]);
  });
});
