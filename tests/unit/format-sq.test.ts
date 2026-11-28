import { describe, expect, it } from "vitest";
import { dateFormatIn, formatDateLongIn, formatDateShortIn, formatPriceIn } from "@/i18n/format";

/**
 * Albanian is formatted by hand (Chrome has no Albanian Intl data → hydration mismatch).
 * Node has the CLDR data, so the hand-made output must equal Node's Intl output.
 */
const sq = (o: Intl.DateTimeFormatOptions, d: Date) => new Intl.DateTimeFormat("sq-AL", o).format(d);

describe("Albanian formatting", () => {
  it("matches CLDR for every month and weekday", () => {
    for (let i = 0; i < 400; i += 3) {
      const d = new Date(Date.UTC(2026, 0, 1 + i, 12));
      const iso = d.toISOString().slice(0, 10);
      expect(formatDateShortIn("sq", iso)).toBe(sq({ weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }, d));
      expect(formatDateLongIn("sq", iso)).toBe(sq({ weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }, d));
      for (const o of [{ month: "long", year: "numeric" }, { day: "numeric", month: "short" }, { day: "numeric", month: "long" }] as Intl.DateTimeFormatOptions[]) {
        expect(dateFormatIn("sq", { ...o, timeZone: "UTC" }).format(d)).toBe(sq({ ...o, timeZone: "UTC" }, d));
      }
    }
  });

  it("uses Vienna time for date + time and formats prices like CLDR", () => {
    expect(dateFormatIn("sq", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Vienna" }).format(new Date("2026-11-24T22:30:00Z"))).toBe("24 nën 2026, 23:30");
    for (const v of [0, 3.99, 39.9, 89.9, 1234.5, 12345.67]) {
      expect(formatPriceIn("sq", v)).toBe(new Intl.NumberFormat("sq-AL", { style: "currency", currency: "EUR" }).format(v));
    }
  });

  it("leaves the other languages to Intl", () => {
    expect(formatPriceIn("sv", 39.9)).toBe(new Intl.NumberFormat("sv-SE", { style: "currency", currency: "EUR" }).format(39.9));
  });
});
