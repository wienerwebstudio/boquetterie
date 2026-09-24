import { describe, expect, it } from "vitest";
import {
  EMPTY_PARAMS, countActiveFilters, filterChips, parseShopParams, removeChip, resetFilters, resultLabel, roughlyDeliverableOn,
  serializeShopParams, shopHref, toProductFilter, toggleListValue, type FilterOptions, type ShopParams,
} from "@/lib/shop-filters";
import { makeProduct } from "./fixtures";

const options: FilterOptions = {
  occasions: [{ value: "geburtstag", label: "Geburtstag" }, { value: "danke", label: "Danke" }],
  today: "2026-09-10",
  maxDate: "2026-10-25",
};

describe("parseShopParams", () => {
  it("returns defaults for an empty query", () => {
    expect(parseShopParams({})).toEqual(EMPTY_PARAMS);
    expect(parseShopParams(new URLSearchParams())).toEqual(EMPTY_PARAMS);
  });

  it("reads comma separated lists, booleans, price presets and sort", () => {
    const p = parseShopParams({ farbe: "rot,rosa", anlass: "geburtstag", preis: "40-60", sameday: "1", lager: "1", sort: "price-asc", datum: "2026-09-12", plz: "1040" });
    expect(p).toEqual({
      ...EMPTY_PARAMS, farbe: ["rot", "rosa"], anlass: ["geburtstag"], preis: "40-60", sameday: true, lager: true, sort: "price-asc", datum: "2026-09-12", plz: "1040",
    });
  });

  it("drops unknown values and keeps the rest", () => {
    const p = parseShopParams({ farbe: "rot,neon,rosa", blume: "orchideen", groesse: "xl,m", sort: "random", preis: "1-2", datum: "12.09.2026", plz: "abc", sameday: "true" });
    expect(p.farbe).toEqual(["rot", "rosa"]);
    expect(p.blume).toEqual([]);
    expect(p.groesse).toEqual(["m"]);
    expect(p.sort).toBe("recommended");
    expect(p.preis).toBeNull();
    expect(p.datum).toBeNull();
    expect(p.plz).toBeNull();
    expect(p.sameday).toBe(false);
  });

  it("de-duplicates, trims and merges repeated keys", () => {
    expect(parseShopParams({ farbe: " rot , rot ,rosa" }).farbe).toEqual(["rot", "rosa"]);
    expect(parseShopParams({ farbe: ["rot", "rosa"] }).farbe).toEqual(["rot", "rosa"]);
    const sp = new URLSearchParams("farbe=rot&farbe=rosa&plz=10%2040");
    expect(parseShopParams(sp)).toMatchObject({ farbe: ["rot", "rosa"], plz: "1040" });
  });
});

describe("serializeShopParams / shopHref", () => {
  it("omits defaults so URLs stay clean", () => {
    expect(serializeShopParams(EMPTY_PARAMS).toString()).toBe("");
    expect(shopHref("/blumen", EMPTY_PARAMS)).toBe("/blumen");
    expect(serializeShopParams({ ...EMPTY_PARAMS, sort: "recommended" }).toString()).toBe("");
  });

  it("round-trips every filter", () => {
    const full: ShopParams = {
      anlass: ["geburtstag", "danke"], blume: ["rosen"], farbe: ["rot", "rosa"], groesse: ["m", "l"], stil: ["elegant"], saison: ["sommer"],
      preis: "ab-90", sameday: true, lager: true, datum: "2026-09-12", plz: "1010", sort: "new",
    };
    const qs = serializeShopParams(full);
    expect(parseShopParams(new URLSearchParams(qs))).toEqual(full);
    expect(parseShopParams(Object.fromEntries(qs))).toEqual(full);
    expect(shopHref("/blumen/rosen", full)).toBe(`/blumen/rosen?${qs.toString()}`);
    expect(qs.get("farbe")).toBe("rot,rosa");
    expect(qs.get("sameday")).toBe("1");
  });

  it("serialises and parses a single filter symmetrically", () => {
    const p = parseShopParams({ farbe: "rosa" });
    expect(shopHref("/blumen", p)).toBe("/blumen?farbe=rosa");
    expect(parseShopParams(new URLSearchParams(serializeShopParams(p)))).toEqual(p);
  });
});

describe("toProductFilter", () => {
  it("maps URL state to the catalog filter incl. price presets", () => {
    const p = parseShopParams({ preis: "40-60", farbe: "rot", sameday: "1" });
    expect(toProductFilter(p)).toMatchObject({ minPrice: 40, maxPrice: 60, colors: ["rot"], sameDayOnly: true, inStockOnly: false });
    expect(toProductFilter(parseShopParams({ preis: "bis-40" }))).toMatchObject({ minPrice: undefined, maxPrice: 40 });
    expect(toProductFilter(parseShopParams({ preis: "ab-90" }))).toMatchObject({ minPrice: 90, maxPrice: undefined });
  });

  it("fixed page filters win over URL occasions", () => {
    const p = parseShopParams({ anlass: "geburtstag" });
    expect(toProductFilter(p, { occasions: ["trauer"] }).occasions).toEqual(["trauer"]);
    expect(toProductFilter(p, { category: "rosen" })).toMatchObject({ category: "rosen", occasions: ["geburtstag"] });
  });
});

describe("chips, counting and toggling", () => {
  const p = parseShopParams({ anlass: "geburtstag", farbe: "rot", preis: "40-60", sameday: "1", datum: "2026-09-12", plz: "1010" });

  it("counts active selections and honours the ignore list", () => {
    expect(countActiveFilters(p)).toBe(6);
    expect(countActiveFilters(p, ["anlass", "plz"])).toBe(4);
    expect(countActiveFilters(EMPTY_PARAMS)).toBe(0);
  });

  it("renders human readable chips and removes them one by one", () => {
    const chips = filterChips(p, options);
    expect(chips.map((c) => c.label)).toEqual(["Geburtstag", "40 – 60 €", "Rot", "Heute lieferbar", expect.stringMatching(/^Lieferung 12\. Sep/), "PLZ 1010"]);
    expect(filterChips(p, options, ["anlass"]).map((c) => c.key)).not.toContain("anlass");

    let next = p;
    for (const chip of chips) next = removeChip(next, chip);
    expect(next).toEqual(EMPTY_PARAMS);
  });

  it("toggleListValue adds and removes, resetFilters keeps the sort", () => {
    const withRosa = toggleListValue(p, "farbe", "rosa");
    expect(withRosa.farbe).toEqual(["rot", "rosa"]);
    expect(toggleListValue(withRosa, "farbe", "rot").farbe).toEqual(["rosa"]);
    expect(resetFilters({ ...p, sort: "price-desc" })).toEqual({ ...EMPTY_PARAMS, sort: "price-desc" });
  });

  it("resultLabel pluralises", () => {
    expect(resultLabel(1)).toBe("1 Strauß");
    expect(resultLabel(0)).toBe("0 Sträuße");
    expect(resultLabel(12)).toBe("12 Sträuße");
  });

  it("roughlyDeliverableOn without a zone", () => {
    const today = "2026-09-10";
    expect(roughlyDeliverableOn(makeProduct({ sameDayCapable: true }), today, today)).toBe(true);
    expect(roughlyDeliverableOn(makeProduct({ sameDayCapable: false }), today, today)).toBe(false);
    expect(roughlyDeliverableOn(makeProduct({ sameDayCapable: false }), "2026-09-11", today)).toBe(true);
    expect(roughlyDeliverableOn(makeProduct(), "2026-09-09", today)).toBe(false);
    expect(roughlyDeliverableOn(makeProduct({ deliverable: false }), "2026-09-11", today)).toBe(false);
  });
});
