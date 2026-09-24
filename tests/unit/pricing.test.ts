import { describe, expect, it } from "vitest";
import { computeTotals, lineTotal, round2, validateCoupon } from "@/lib/pricing";
import { makeCoupon, makeItem, noeUmland, wienZentrum } from "./fixtures";

const TODAY = "2026-09-10";
const extra = { extraId: "x-card", quantity: 1, name: "Premium-Grußkarte", price: 4.9, image: "/x.jpg" };

describe("computeTotals – subtotals", () => {
  it("splits bouquets and extras and sums them", () => {
    const t = computeTotals({ items: [makeItem({ unitPrice: 44.9, extras: [extra] })], today: TODAY });
    expect(t.itemsSubtotal).toBe(44.9);
    expect(t.extrasSubtotal).toBe(4.9);
    expect(t.subtotal).toBe(49.8);
  });

  it("multiplies by quantity for items and extras", () => {
    const t = computeTotals({ items: [makeItem({ unitPrice: 20, quantity: 2, extras: [{ ...extra, quantity: 3 }] })], today: TODAY });
    expect(t.itemsSubtotal).toBe(40);
    expect(t.extrasSubtotal).toBe(14.7);
    expect(t.subtotal).toBe(54.7);
  });

  it("handles an empty cart", () => {
    const t = computeTotals({ items: [], zone: wienZentrum, today: TODAY });
    expect(t.subtotal).toBe(0);
    expect(t.total).toBe(7.9); // delivery still quoted for the zone – the UI hides it for empty carts
  });
});

describe("computeTotals – delivery", () => {
  it("leaves delivery open without a zone", () => {
    const t = computeTotals({ items: [makeItem()], today: TODAY });
    expect(t).toMatchObject({ delivery: 0, deliveryBase: 0, deliverySurcharge: 0, freeDeliveryFrom: null, missingForFreeDelivery: null, belowMinOrder: false, minOrder: 0 });
    expect(t.total).toBe(44.9);
  });

  it("quotes the zone fee and the amount missing for free delivery", () => {
    const t = computeTotals({ items: [makeItem({ unitPrice: 44.9 })], zone: wienZentrum, today: TODAY });
    expect(t.delivery).toBe(7.9);
    expect(t.freeDeliveryFrom).toBe(80);
    expect(t.missingForFreeDelivery).toBe(35.1);
    expect(t.total).toBe(52.8);
  });

  it("is free from the threshold on", () => {
    const t = computeTotals({ items: [makeItem({ unitPrice: 44.9, quantity: 2 })], zone: wienZentrum, today: TODAY });
    expect(t.delivery).toBe(0);
    expect(t.missingForFreeDelivery).toBeNull();
    expect(t.total).toBe(89.8);
  });

  it("adds the window surcharge on top of the base fee", () => {
    const t = computeTotals({ items: [makeItem({ unitPrice: 44.9 })], zone: wienZentrum, windowId: "eve", today: TODAY });
    expect(t).toMatchObject({ deliveryBase: 7.9, deliverySurcharge: 4.9, delivery: 12.8 });
    expect(t.total).toBe(57.7);
  });

  it("flags carts below the zone's minimum order", () => {
    const below = computeTotals({ items: [makeItem({ unitPrice: 29.9 })], zone: noeUmland, today: TODAY });
    expect(below).toMatchObject({ belowMinOrder: true, minOrder: 39, freeDeliveryFrom: null, missingForFreeDelivery: null });
    const ok = computeTotals({ items: [makeItem({ unitPrice: 44.9 })], zone: noeUmland, today: TODAY });
    expect(ok.belowMinOrder).toBe(false);
  });
});

describe("computeTotals – coupons", () => {
  const cart = [makeItem({ unitPrice: 44.9, extras: [extra] })]; // subtotal 49.8

  it("applies a percent coupon to the subtotal (items + extras) and rounds to cents", () => {
    const t = computeTotals({ items: cart, zone: wienZentrum, coupon: makeCoupon({ type: "percent", value: 10 }), today: TODAY });
    expect(t.discount).toBe(4.98);
    expect(t.total).toBe(52.72); // 49.8 − 4.98 + 7.9
    expect(t.couponError).toBeUndefined();
  });

  it("applies a fixed coupon and caps it at the subtotal", () => {
    const fixed = computeTotals({ items: cart, coupon: makeCoupon({ type: "fixed", value: 10 }), today: TODAY });
    expect(fixed.discount).toBe(10);
    expect(fixed.total).toBe(39.8);

    const capped = computeTotals({ items: cart, zone: wienZentrum, coupon: makeCoupon({ type: "fixed", value: 500 }), today: TODAY });
    expect(capped.discount).toBe(49.8);
    expect(capped.total).toBe(7.9); // only delivery remains, never negative
  });

  it("free_shipping waives the base fee but not a window surcharge", () => {
    const t = computeTotals({ items: cart, zone: wienZentrum, windowId: "eve", coupon: makeCoupon({ type: "free_shipping", value: 0 }), today: TODAY });
    expect(t).toMatchObject({ discount: 0, deliveryBase: 0, deliverySurcharge: 4.9, delivery: 4.9 });
    expect(t.total).toBe(54.7);
  });

  it("rejects a coupon below its minimum order and reports the reason", () => {
    const t = computeTotals({ items: cart, zone: wienZentrum, coupon: makeCoupon({ minOrder: 100 }), today: TODAY });
    expect(t.discount).toBe(0);
    expect(t.couponError).toContain("100,00 €");
    expect(t.total).toBe(57.7);
  });

  it("accepts a coupon exactly at its minimum order", () => {
    const t = computeTotals({ items: cart, coupon: makeCoupon({ minOrder: 49.8, type: "fixed", value: 5 }), today: TODAY });
    expect(t.discount).toBe(5);
  });

  it("rejects inactive, not-yet-valid and expired coupons", () => {
    expect(validateCoupon(makeCoupon({ active: false }), 100, TODAY)).toEqual({ ok: false, error: "Dieser Code ist nicht mehr gültig." });
    expect(validateCoupon(makeCoupon({ validFrom: "2026-10-01" }), 100, TODAY).error).toBe("Dieser Code ist noch nicht gültig.");
    expect(validateCoupon(makeCoupon({ validUntil: "2026-09-09" }), 100, TODAY).error).toBe("Dieser Code ist abgelaufen.");
    expect(validateCoupon(makeCoupon({ validFrom: TODAY, validUntil: TODAY }), 100, TODAY)).toEqual({ ok: true });
    expect(validateCoupon(null, 100, TODAY).ok).toBe(false);
    expect(validateCoupon(undefined, 100, TODAY).error).toBe("Dieser Code ist uns nicht bekannt.");
  });
});

describe("rounding", () => {
  it("round2 rounds half up to cents and kills float noise", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1);
    expect(round2(2.675)).toBe(2.68);
    expect(round2(49.8 * 0.1)).toBe(4.98);
  });

  it("lineTotal and totals stay on two decimals for awkward prices", () => {
    const item = makeItem({ unitPrice: 19.99, quantity: 3, extras: [{ ...extra, price: 0.1, quantity: 3 }] });
    expect(lineTotal(item)).toBe(60.27);
    const t = computeTotals({ items: [item, makeItem({ id: "item-2", unitPrice: 33.33 })], coupon: makeCoupon({ type: "percent", value: 15 }), today: TODAY });
    expect(t.subtotal).toBe(93.6);
    expect(t.discount).toBe(14.04);
    expect(t.total).toBe(79.56);
  });
});
