import { describe, expect, it } from "vitest";
import {
  cartLineValue, classifyOutboundLink, filterChanges, pageTypeFromPath, regionGroup, searchQueryKey,
} from "@/components/analytics/event-props";
import { EMPTY_PARAMS } from "@/lib/shop-filters";

describe("regionGroup", () => {
  it("maps postal codes to a coarse region", () => {
    expect(regionGroup("1010")).toBe("wien");
    expect(regionGroup("2340")).toBe("noe");
    expect(regionGroup("3100")).toBe("noe");
    expect(regionGroup("4020")).toBe("other");
    expect(regionGroup("")).toBe("other");
  });
});

describe("pageTypeFromPath", () => {
  it("handles German paths without prefix", () => {
    expect(pageTypeFromPath("/")).toBe("home");
    expect(pageTypeFromPath("/produkt/rose-dream")).toBe("product");
    expect(pageTypeFromPath("/blumen")).toBe("category");
    expect(pageTypeFromPath("/blumen/pastell")).toBe("category");
    expect(pageTypeFromPath("/anlaesse/muttertag")).toBe("occasion");
    expect(pageTypeFromPath("/checkout")).toBe("checkout");
    expect(pageTypeFromPath("/kontakt")).toBe("contact");
    expect(pageTypeFromPath("/faq")).toBe("faq");
    expect(pageTypeFromPath("/impressum")).toBe("other");
    expect(pageTypeFromPath("/warenkorb")).toBe("other");
  });

  it("strips the locale prefix and maps translated segments", () => {
    expect(pageTypeFromPath("/en")).toBe("home");
    expect(pageTypeFromPath("/en/product/rose-dream")).toBe("product");
    expect(pageTypeFromPath("/tr/urun/rose-dream")).toBe("product");
    expect(pageTypeFromPath("/tr/cicekler/rosen")).toBe("category");
    expect(pageTypeFromPath("/en/contact")).toBe("contact");
    expect(pageTypeFromPath("/de/kontakt")).toBe("contact");
  });

  it("treats unknown single segments as landing pages", () => {
    expect(pageTypeFromPath("/blumen-wien-15")).toBe("landing");
    expect(pageTypeFromPath("/en/blumen-wien-15")).toBe("landing");
    expect(pageTypeFromPath("/foo/bar")).toBe("other");
    expect(pageTypeFromPath("/admin")).toBe("other");
  });

  it("ignores query and hash", () => {
    expect(pageTypeFromPath("/produkt/x?ref=1#top")).toBe("product");
  });
});

describe("classifyOutboundLink", () => {
  it("detects WhatsApp links", () => {
    expect(classifyOutboundLink("https://wa.me/431234567?text=Hallo")).toEqual({ kind: "whatsapp" });
    expect(classifyOutboundLink("https://api.whatsapp.com/send?phone=43")).toEqual({ kind: "whatsapp" });
  });
  it("detects review platforms", () => {
    expect(classifyOutboundLink("https://www.trustpilot.com/review/blumora.at")).toEqual({ kind: "review", platform: "trustpilot" });
    expect(classifyOutboundLink("https://at.trustpilot.com/evaluate/blumora.at")).toEqual({ kind: "review", platform: "trustpilot" });
    expect(classifyOutboundLink("https://g.page/r/abc/review")).toEqual({ kind: "review", platform: "google" });
    expect(classifyOutboundLink("https://search.google.com/local/writereview?placeid=x")).toEqual({ kind: "review", platform: "google" });
    expect(classifyOutboundLink("https://www.google.com/maps/place/x")).toEqual({ kind: "review", platform: "google" });
  });
  it("ignores everything else", () => {
    expect(classifyOutboundLink("/kontakt")).toBeNull();
    expect(classifyOutboundLink("https://www.google.com/search?q=wa.me")).toBeNull();
    expect(classifyOutboundLink("mailto:hallo@example.com")).toBeNull();
  });
});

describe("cartLineValue", () => {
  it("includes quantity and extras", () => {
    expect(cartLineValue({
      quantity: 2,
      snapshot: { unitPrice: 45.9 } as never,
      extras: [{ extraId: "vase", quantity: 1, price: 14.9, name: "Vase", image: "" }],
    })).toBe(106.7);
  });
});

describe("filterChanges", () => {
  it("reports only newly chosen values and never the postal code", () => {
    const prev = { ...EMPTY_PARAMS, farbe: ["rosa"] };
    const next = { ...prev, farbe: ["rosa", "weiss"], sameday: true, plz: "1100", sort: "price-asc" as typeof prev.sort };
    expect(filterChanges(prev, next)).toEqual([
      { filter_type: "farbe", filter_value: "weiss" },
      { filter_type: "verfuegbarkeit", filter_value: "sameday" },
      { filter_type: "plz", filter_value: "set" },
      { filter_type: "sort", filter_value: "price-asc" },
    ]);
    expect(filterChanges(next, { ...next, farbe: [] })).toEqual([]);
  });
});

describe("searchQueryKey", () => {
  it("normalises case and whitespace", () => {
    expect(searchQueryKey("  Rosen   Mama ")).toBe("rosen mama");
  });
});
