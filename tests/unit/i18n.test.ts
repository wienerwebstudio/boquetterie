import { describe, expect, it } from "vitest";
import { LOCALES, localeFromBrowser } from "@/i18n/config";
import { localizePath, resolvePublicPath, SEGMENT_NAMES, switchLocalePath } from "@/i18n/paths";
import { fmt, formatPriceIn, plural } from "@/i18n/format";
import { loadMessages } from "@/i18n/messages";

describe("language URLs", () => {
  it("keeps German at the root and prefixes other languages with translated segments", () => {
    expect(localizePath("de", "/blumen/rosen")).toBe("/blumen/rosen");
    expect(localizePath("en", "/blumen/rosen?farbe=rot")).toBe("/en/flowers/rosen?farbe=rot");
    expect(localizePath("tr", "/produkt/rosalie")).toBe("/tr/urun/rosalie");
    expect(localizePath("en", "/")).toBe("/en");
    expect(localizePath("en", "/checkout/rueckkehr")).toBe("/en/checkout/rueckkehr");
    expect(localizePath("en", "/api/orders")).toBe("/api/orders");
    expect(localizePath("en", "https://example.com/x")).toBe("https://example.com/x");
  });

  it("maps public URLs to internal routes and back", () => {
    expect(resolvePublicPath("/blumen/rosen")).toEqual({ locale: "de", internal: "/de/blumen/rosen" });
    expect(resolvePublicPath("/")).toEqual({ locale: "de", internal: "/de" });
    expect(resolvePublicPath("/tr/cicekler/rosen")).toEqual({ locale: "tr", internal: "/tr/blumen/rosen" });
    expect(resolvePublicPath("/en")).toEqual({ locale: "en", internal: "/en" });
    expect(resolvePublicPath("/de/kontakt")?.redirect).toBe("/kontakt");
    expect(resolvePublicPath("/en/blumen")?.redirect).toBe("/en/flowers");
    expect(resolvePublicPath("/api/orders")).toBeNull();
    expect(resolvePublicPath("/llms.txt")).toBeNull();
    expect(resolvePublicPath("/admin")).toBeNull();
  });

  it("has unique translated segment names per language that round-trip", () => {
    for (const [locale, map] of Object.entries(SEGMENT_NAMES)) {
      const names = Object.values(map);
      expect(new Set(names).size, locale).toBe(names.length);
      for (const [german, name] of Object.entries(map)) {
        expect(name, `${locale}/${german}`).toMatch(/^[a-z0-9-]+$/);
        expect(resolvePublicPath(`/${locale}/${name}/x`)?.internal).toBe(`/${locale}/${german}/x`);
      }
    }
  });

  it("switches language on the same page; topic pages go to the other language's home", () => {
    expect(switchLocalePath("/en/flowers/rosen", "tr")).toBe("/tr/cicekler/rosen");
    expect(switchLocalePath("/tr/urun/rosalie", "de")).toBe("/produkt/rosalie");
    expect(switchLocalePath("/blumenversand-wien", "en")).toBe("/en");
  });

  it("maps browser languages, BKS included", () => {
    expect(localeFromBrowser("hr-HR")).toBe("bks");
    expect(localeFromBrowser("sr")).toBe("bks");
    expect(localeFromBrowser("uk-UA")).toBe("uk");
    expect(localeFromBrowser("nl")).toBe("nl");
    expect(localeFromBrowser("nb-NO")).toBe("no");
    expect(localeFromBrowser("nn")).toBe("no");
    expect(localeFromBrowser("ja")).toBeNull();
  });
});

describe("formatting", () => {
  it("fills placeholders and formats prices and plurals per language", () => {
    expect(fmt("ab {price}", { price: "39 €" })).toBe("ab 39 €");
    expect(formatPriceIn("de", 39.9)).toMatch(/39,90/);
    expect(formatPriceIn("en", 39.9)).toMatch(/39\.90/);
    expect(formatPriceIn("ar", 39.9)).toMatch(/39/);
    expect(plural("pl", 2, { one: "{count} kwiat", few: "{count} kwiaty", many: "{count} kwiatów", other: "{count} kwiatu" })).toBe("2 kwiaty");
  });
});

describe("messages", () => {
  it("falls back to German for missing keys in every language", async () => {
    for (const l of LOCALES) {
      const m = await loadMessages(l);
      expect(m.common.close.length, l).toBeGreaterThan(0);
    }
  });
});
