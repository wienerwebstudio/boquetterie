import { describe, expect, it } from "vitest";
import {
  addDays, findZone, getAvailableDays, getLocalNow, isSameDayAvailable, isSameDayPossibleNow,
  isValidAustrianPostalCode, normalizePostalCode, quoteDelivery, toMinutes, weekdayOf, zoneContains,
} from "@/lib/delivery";
import type { DeliveryZone } from "@/types";
import { FRI, MON, SAT, SUN, THU, TUE, at, makeProduct, noeUmland, settings, wienAussen, wienZentrum, zones } from "./fixtures";

const dates = (days: ReturnType<typeof getAvailableDays>) => days.map((d) => d.date);

describe("delivery engine – same-day", () => {
  it("offers same-day before the same-day cutoff", () => {
    const days = getAvailableDays({ zone: wienZentrum, settings, now: at(THU, "10:00") });
    expect(days[0]).toMatchObject({ date: THU, sameDay: true });
    expect(days[1]).toMatchObject({ date: FRI, sameDay: false });
  });

  it("only keeps same-day windows that end at least an hour from now", () => {
    const early = getAvailableDays({ zone: wienZentrum, settings, now: at(THU, "10:00") });
    expect(early[0].windows.map((w) => w.id)).toEqual(["am", "pm", "eve"]);

    // 11:59 + 60 min = 12:59 → the 9–13 window (ends 13:00) is still just possible.
    const late = getAvailableDays({ zone: wienZentrum, settings, now: at(THU, "11:59") });
    expect(late[0].windows.map((w) => w.id)).toEqual(["am", "pm", "eve"]);
  });

  it("drops same-day once the same-day cutoff has passed (but stays before the day cutoff)", () => {
    const days = getAvailableDays({ zone: wienZentrum, settings, now: at(THU, "12:00") });
    expect(days[0]).toMatchObject({ date: FRI, sameDay: false });
    expect(days.some((d) => d.sameDay)).toBe(false);
  });

  it("never offers same-day for zones without sameDay", () => {
    const days = getAvailableDays({ zone: wienAussen, settings, now: at(THU, "09:00") });
    expect(days[0].date).toBe(FRI);
    expect(days.every((d) => !d.sameDay)).toBe(true);
  });

  it("respects the global sameDayEnabled switch", () => {
    const days = getAvailableDays({ zone: wienZentrum, settings: { ...settings, sameDayEnabled: false }, now: at(THU, "09:00") });
    expect(days[0].date).toBe(FRI);
  });

  it("skips same-day for products that are not sameDayCapable", () => {
    const product = makeProduct({ sameDayCapable: false });
    const days = getAvailableDays({ zone: wienZentrum, settings, now: at(THU, "09:00"), product });
    expect(days[0]).toMatchObject({ date: FRI, sameDay: false });
    expect(isSameDayAvailable({ zone: wienZentrum, settings, now: at(THU, "09:00"), product })).toBe(false);
    expect(isSameDayAvailable({ zone: wienZentrum, settings, now: at(THU, "09:00") })).toBe(true);
  });

  it("returns nothing for products that are not deliverable or inactive zones", () => {
    expect(getAvailableDays({ zone: wienZentrum, settings, now: at(THU, "09:00"), product: makeProduct({ deliverable: false }) })).toEqual([]);
    expect(getAvailableDays({ zone: { ...wienZentrum, active: false }, settings, now: at(THU, "09:00") })).toEqual([]);
  });
});

describe("delivery engine – cutoff, Sundays and blackout dates", () => {
  it("delivers tomorrow when ordered before the day cutoff", () => {
    const days = getAvailableDays({ zone: wienZentrum, settings, now: at(THU, "13:59") });
    expect(days[0].date).toBe(FRI);
  });

  it("pushes the first delivery to the day after tomorrow once the cutoff has passed", () => {
    const days = getAvailableDays({ zone: wienZentrum, settings, now: at(THU, "14:00") });
    expect(days[0].date).toBe(SAT);
    expect(dates(days)).not.toContain(FRI);
  });

  it("skips Sunday – Saturday afternoon orders arrive on Monday", () => {
    const days = getAvailableDays({ zone: wienZentrum, settings, now: at(SAT, "15:00") });
    expect(days[0].date).toBe(MON);
    expect(dates(days)).not.toContain(SUN);
  });

  it("skips Sunday even when it would be the next day", () => {
    const days = getAvailableDays({ zone: wienZentrum, settings, now: at(SAT, "13:00") });
    expect(days[0].date).toBe(MON);
  });

  it("never lists a Sunday in the whole horizon", () => {
    const days = getAvailableDays({ zone: wienZentrum, settings, now: at(THU, "10:00"), horizonDays: 45 });
    expect(days.every((d) => weekdayOf(d.date) !== 0)).toBe(true);
    expect(days.length).toBeGreaterThan(30);
  });

  it("removes blackout dates and disables same-day on a blackout day", () => {
    const blackout = { ...settings, blackoutDates: [FRI] };
    const days = getAvailableDays({ zone: wienZentrum, settings: blackout, now: at(THU, "10:00") });
    expect(dates(days)).not.toContain(FRI);
    expect(days[0].date).toBe(THU);

    const todayBlocked = getAvailableDays({ zone: wienZentrum, settings: { ...settings, blackoutDates: [THU] }, now: at(THU, "10:00") });
    expect(todayBlocked[0]).toMatchObject({ date: FRI, sameDay: false });
  });

  it("honours the delivery horizon", () => {
    const days = getAvailableDays({ zone: wienZentrum, settings, now: at(THU, "10:00"), horizonDays: 3 });
    expect(dates(days)).toEqual([THU, FRI, SAT, SUN].filter((d) => d !== SUN));
  });
});

describe("delivery engine – Niederösterreich zone (Tue/Thu/Sat)", () => {
  it("only offers Tuesday, Thursday and Saturday", () => {
    const days = getAvailableDays({ zone: noeUmland, settings, now: at(THU, "10:00"), horizonDays: 14 });
    expect(days.length).toBeGreaterThan(0);
    expect(days.every((d) => [2, 4, 6].includes(weekdayOf(d.date)))).toBe(true);
    expect(days.every((d) => !d.sameDay)).toBe(true);
    expect(dates(days).slice(0, 3)).toEqual([SAT, TUE, "2026-09-17"]);
  });

  it("applies its own (earlier) cutoff", () => {
    // NÖ cutoff is 12:00 – ordering Thursday 12:30 shifts lead by one day, Saturday still fits.
    const days = getAvailableDays({ zone: noeUmland, settings, now: at(THU, "12:30"), horizonDays: 14 });
    expect(days[0].date).toBe(SAT);
    // Ordering on Monday afternoon: Tuesday is skipped, Thursday is next.
    const monday = getAvailableDays({ zone: noeUmland, settings, now: at(MON, "13:00"), horizonDays: 14 });
    expect(monday[0].date).toBe("2026-09-17");
  });
});

describe("isSameDayPossibleNow", () => {
  it("is true while at least one same-day zone is before its cutoff", () => {
    expect(isSameDayPossibleNow(zones, settings, at(THU, "10:00"))).toBe(true);
    // wien-innen closes at 11:00, wien-zentrum at 12:00 → still possible at 11:30
    expect(isSameDayPossibleNow(zones, settings, at(THU, "11:30"))).toBe(true);
  });

  it("is false after every same-day cutoff, on Sundays and when disabled", () => {
    expect(isSameDayPossibleNow(zones, settings, at(THU, "12:00"))).toBe(false);
    expect(isSameDayPossibleNow(zones, settings, at(SUN, "09:00"))).toBe(false);
    expect(isSameDayPossibleNow(zones, { ...settings, sameDayEnabled: false }, at(THU, "09:00"))).toBe(false);
    expect(isSameDayPossibleNow(zones, { ...settings, blackoutDates: [THU] }, at(THU, "09:00"))).toBe(false);
  });
});

describe("findZone / postal codes", () => {
  it("matches ranges inclusively and single codes", () => {
    expect(findZone("1010", zones)?.id).toBe("wien-zentrum");
    expect(findZone("1090", zones)?.id).toBe("wien-zentrum");
    expect(findZone("1100", zones)?.id).toBe("wien-innen");
    expect(findZone("1230", zones)?.id).toBe("wien-aussen");
    expect(findZone("2201", zones)?.id).toBe("noe-umland");
    expect(findZone("2340", zones)?.id).toBe("noe-umland");
  });

  it("returns null for unknown or invalid postal codes", () => {
    expect(findZone("8010", zones)).toBeNull(); // Graz – not served
    expect(findZone("2202", zones)).toBeNull(); // between explicit NÖ codes
    expect(findZone("0123", zones)).toBeNull(); // leading zero is invalid in Austria
    expect(findZone("abc", zones)).toBeNull();
    expect(findZone("", zones)).toBeNull();
    expect(findZone("11005", zones)?.id).toBe("wien-innen"); // truncated to four digits like user input
  });

  it("normalises user input before matching", () => {
    expect(normalizePostalCode(" 10 40 ")).toBe("1040");
    expect(normalizePostalCode("A-1010")).toBe("1010");
    expect(findZone(" 10 40 ", zones)?.id).toBe("wien-zentrum");
    expect(isValidAustrianPostalCode("1040")).toBe(true);
    expect(isValidAustrianPostalCode("104")).toBe(false);
  });

  it("ignores inactive zones", () => {
    const inactive: DeliveryZone[] = zones.map((z) => (z.id === "wien-zentrum" ? { ...z, active: false } : z));
    expect(findZone("1040", inactive)).toBeNull();
    expect(zoneContains(wienZentrum, "1040")).toBe(true);
    expect(zoneContains(wienZentrum, "x")).toBe(false);
  });
});

describe("quoteDelivery", () => {
  it("charges the base fee below the free-from threshold", () => {
    const q = quoteDelivery(wienZentrum, 50);
    expect(q).toMatchObject({ fee: 7.9, baseFee: 7.9, surcharge: 0, isFree: false, freeFrom: 80, belowMinOrder: false });
  });

  it("is free from the threshold on (inclusive)", () => {
    expect(quoteDelivery(wienZentrum, 79.99).isFree).toBe(false);
    expect(quoteDelivery(wienZentrum, 80)).toMatchObject({ fee: 0, isFree: true });
  });

  it("adds the window surcharge even when the base fee is free", () => {
    expect(quoteDelivery(wienZentrum, 50, "eve")).toMatchObject({ fee: 12.8, baseFee: 7.9, surcharge: 4.9 });
    expect(quoteDelivery(wienZentrum, 120, "eve")).toMatchObject({ fee: 4.9, baseFee: 0, surcharge: 4.9, isFree: true });
    expect(quoteDelivery(wienZentrum, 50, "does-not-exist").surcharge).toBe(0);
  });

  it("never becomes free without a threshold and flags the minimum order", () => {
    expect(quoteDelivery(noeUmland, 500)).toMatchObject({ fee: 14.9, isFree: false, freeFrom: null });
    expect(quoteDelivery(noeUmland, 30)).toMatchObject({ belowMinOrder: true, minOrder: 39 });
    expect(quoteDelivery(noeUmland, 39).belowMinOrder).toBe(false);
  });
});

describe("date helpers", () => {
  it("addDays / weekdayOf / toMinutes work on ISO strings", () => {
    expect(addDays(THU, 1)).toBe(FRI);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays(THU, -10)).toBe("2026-08-31");
    expect(weekdayOf(SUN)).toBe(0);
    expect(weekdayOf(SAT)).toBe(6);
    expect(toMinutes("14:00")).toBe(840);
    expect(toMinutes("9")).toBe(540);
  });

  it("getLocalNow converts a fixed instant into the shop timezone", () => {
    // 08:30 UTC in September = 10:30 CEST
    const now = getLocalNow("Europe/Vienna", new Date("2026-09-10T08:30:00Z"));
    expect(now).toEqual({ date: THU, minutes: 630, weekday: 4 });
    // 23:30 UTC on the 10th is already the 11th in Vienna
    expect(getLocalNow("Europe/Vienna", new Date("2026-09-10T23:30:00Z")).date).toBe(FRI);
  });
});
