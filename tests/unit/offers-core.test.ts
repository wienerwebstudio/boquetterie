import { describe, expect, it } from "vitest";
import type { Offer } from "@/types";
import {
  defaultValidUntil, deliveryDayWarning, isOfferPayable, offerOrderLines, offerPreviewOrder, offerRecipientAddition, offerStatus, offerTimeLabel, offerTotals,
  offerWindowLabel, parseOfferInput, type OfferCatalog,
} from "@/lib/offers-core";

/** The real request: pink tulips for a tourist from Taiwan, meeting point at the Burgtheater. */
export function tulipOffer(over: Partial<Offer> = {}): Offer {
  return {
    id: "AN-TULIP1", token: "A".repeat(32), createdAt: "2026-11-20T09:00:00.000Z", updatedAt: "2026-11-20T09:00:00.000Z",
    status: "sent", locale: "en",
    customer: { firstName: "Mei", lastName: "Lin", email: "mei@example.com", phone: "+886 912 345 678" },
    items: [{ id: "i1", kind: "custom", title: "Bouquet of pink tulips", description: "About 30 pink tulips only", image: "/media/tulips.jpg", quantity: 1, unitPrice: 79, floristBudget: 40 }],
    extras: [{ extraId: "x-card", name: "Karte", quantity: 1, unitPrice: 4.5 }],
    delivery: { enabled: true, date: "2026-11-29", from: "14:00", to: "16:00", fee: 9.9, zoneId: "wien-mitte", zoneName: "Wien Mitte" },
    recipient: { kind: "meeting", firstName: "Mei", lastName: "Lin", phone: "+886 912 345 678", street: "Universitätsring", houseNumber: "2", addition: "Haupteingang Burgtheater", zip: "1010", city: "Wien" },
    validUntil: "2026-11-23",
    history: [],
    ...over,
  };
}

const catalog: OfferCatalog = {
  products: [{ id: "p-amour", name: "Amour", active: true, images: [{ src: "/images/products/amour-1.jpg", kind: "front" }], sizes: [{ id: "m", label: "Medium", price: 64.9 }] }],
  extras: [{ id: "x-teddy", name: "Teddy", active: true, image: "/images/extras/teddy.jpg" }],
  locales: ["de", "en", "ce"],
};

describe("offer totals", () => {
  it("adds items, extras and the delivery fee (rounded to cents)", () => {
    expect(offerTotals(tulipOffer())).toEqual({ items: 79, extras: 4.5, delivery: 9.9, total: 93.4 });
    const o = tulipOffer({ items: [{ id: "a", kind: "custom", title: "x", quantity: 3, unitPrice: 0.1 }], extras: [], delivery: { ...tulipOffer().delivery, fee: 0 } });
    expect(offerTotals(o).total).toBe(0.3);
  });
});

describe("offer status and validity", () => {
  it("derives viewed and expired, keeps paid/cancelled/draft", () => {
    expect(offerStatus(tulipOffer(), "2026-11-21")).toBe("sent");
    expect(offerStatus(tulipOffer({ viewedAt: "2026-11-21T10:00:00Z" }), "2026-11-21")).toBe("viewed");
    expect(offerStatus(tulipOffer(), "2026-11-23")).toBe("sent"); // valid until is inclusive
    expect(offerStatus(tulipOffer(), "2026-11-24")).toBe("expired");
    expect(offerStatus(tulipOffer({ status: "paid" }), "2027-01-01")).toBe("paid");
    expect(offerStatus(tulipOffer({ status: "cancelled" }), "2026-11-21")).toBe("cancelled");
    expect(offerStatus(tulipOffer({ status: "draft" }), "2026-11-21")).toBe("draft");
  });

  it("only sent/viewed offers within their validity are payable", () => {
    expect(isOfferPayable(tulipOffer(), "2026-11-23")).toBe(true);
    expect(isOfferPayable(tulipOffer(), "2026-11-24")).toBe(false);
    expect(isOfferPayable(tulipOffer({ status: "draft" }), "2026-11-21")).toBe(false);
    expect(isOfferPayable(tulipOffer({ status: "paid" }), "2026-11-21")).toBe(false);
    expect(isOfferPayable(tulipOffer({ status: "cancelled" }), "2026-11-21")).toBe(false);
  });

  it("defaults to today + 3 days, also across months", () => {
    expect(defaultValidUntil("2026-11-20")).toBe("2026-11-23");
    expect(defaultValidUntil("2026-11-29")).toBe("2026-12-02");
  });
});

describe("delivery helpers", () => {
  it("labels the free window like the zone windows, or uses the free text", () => {
    expect(offerWindowLabel("14:00", "16:00")).toBe("14:00–16:00 Uhr");
    expect(offerTimeLabel({ from: "14:00", to: "16:00" })).toBe("14:00–16:00 Uhr");
    expect(offerTimeLabel({ from: "", to: "", text: "ca. 15 Uhr" })).toBe("ca. 15 Uhr");
    expect(offerTimeLabel({ from: "", to: "" })).toBeUndefined();
  });
  it("warns (only) about blackout days and weekdays the zone does not serve", () => {
    const zone = { name: "Wien Zentrum", deliveryDays: [1, 2, 3, 4, 5, 6] };
    expect(deliveryDayWarning("2026-11-29", zone, { blackoutDates: [] })).toContain("Wochentag"); // a Sunday
    expect(deliveryDayWarning("2026-12-25", zone, { blackoutDates: ["2026-12-25"] })).toContain("Sperrtag");
    expect(deliveryDayWarning("2026-11-27", zone, { blackoutDates: [] })).toBeNull();
  });
  it("marks a meeting point for florist and courier", () => {
    expect(offerRecipientAddition(tulipOffer().recipient)).toBe("Treffpunkt: Haupteingang Burgtheater");
    expect(offerRecipientAddition({ kind: "address", addition: "Top 4" })).toBe("Top 4");
  });
});

describe("order lines from an offer", () => {
  it("turns custom items into custom lines and attaches extras to the first line", () => {
    const lines = offerOrderLines(tulipOffer(), { cardsEnabled: false });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ productId: "custom", custom: true, productName: "Bouquet of pink tulips", sizeLabel: "", unitPrice: 79, quantity: 1, image: "/media/tulips.jpg", description: "About 30 pink tulips only", floristBudget: 40 });
    expect(lines[0].extras).toEqual([{ extraId: "x-card", name: "Karte", quantity: 1, unitPrice: 4.5 }]);
  });
  it("keeps the card text only when cards are on offer", () => {
    const o = tulipOffer({ greeting: { message: "Happy birthday", senderName: "Mei" } });
    expect(offerOrderLines(o, { cardsEnabled: false })[0].message).toBeUndefined();
    expect(offerOrderLines(o, { cardsEnabled: true })[0]).toMatchObject({ message: "Happy birthday", senderName: "Mei" });
  });
  it("renders as an unpaid order for the mail with the offer totals", () => {
    const order = offerPreviewOrder(tulipOffer(), { cardsEnabled: false });
    expect(order.totals.total).toBe(93.4);
    expect(order.delivery.windowLabel).toBe("14:00–16:00 Uhr");
    expect(order.recipient.addition).toBe("Treffpunkt: Haupteingang Burgtheater");
  });
});

describe("admin input", () => {
  const valid = {
    locale: "en",
    customer: { firstName: " Mei ", lastName: "Lin", email: "MEI@example.com", phone: "" },
    items: [
      { kind: "custom", title: "Pink tulips", description: "only pink", quantity: "1", unitPrice: "79,00" },
      { kind: "product", productId: "p-amour", sizeId: "m", quantity: 2, unitPrice: 55, title: "ignored" },
    ],
    extras: [{ extraId: "x-teddy", quantity: 1, unitPrice: "12.5" }],
    delivery: { date: "2026-11-29", from: "14:00", to: "16:00", fee: "9,9" },
    recipient: { kind: "meeting", firstName: "Mei", phone: "+886 912 345 678", street: "Universitätsring", houseNumber: "2", addition: "Haupteingang Burgtheater", zip: "1010", city: "Wien" },
    validUntil: "2026-11-23",
  };

  it("normalises prices and resolves product and extra names from the catalogue", () => {
    const r = parseOfferInput(valid, catalog);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.offer.customer).toMatchObject({ firstName: "Mei", email: "mei@example.com" });
    expect(r.offer.items[0]).toMatchObject({ kind: "custom", unitPrice: 79 });
    expect(r.offer.items[1]).toMatchObject({ kind: "product", title: "Amour", sizeLabel: "Medium", unitPrice: 55, image: "/images/products/amour-1.jpg" });
    expect(r.offer.extras[0]).toMatchObject({ name: "Teddy", unitPrice: 12.5 });
    expect(r.offer.delivery.fee).toBe(9.9);
    expect(offerTotals(r.offer).total).toBe(79 + 110 + 12.5 + 9.9);
  });

  it("reports missing fields, a bad window and the required recipient phone", () => {
    const r = parseOfferInput({ ...valid, customer: { email: "nope" }, items: [], delivery: { date: "x", from: "16:00", to: "14:00", fee: -1 }, recipient: { kind: "meeting", zip: "99", phone: "abc" } }, catalog);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    for (const k of ["customer.firstName", "customer.email", "items", "delivery.date", "delivery.to", "delivery.fee", "recipient.phone", "recipient.addition", "recipient.city"]) {
      expect(r.errors[k], k).toBeTruthy();
    }
    // Free-form: any ZIP (no zone), no phone, no window is fine.
    expect(r.errors["recipient.zip"]).toBeUndefined();
    const free = parseOfferInput({ ...valid, delivery: { date: "2026-12-10", fee: "" }, recipient: { firstName: "Mei", street: "Hauptplatz", city: "Graz", zip: "8010" } }, catalog);
    expect(free.ok).toBe(true);
    if (free.ok) expect(free.offer.delivery).toMatchObject({ enabled: true, from: "", to: "", fee: 0 });
  });

  it("allows an offer without any delivery", () => {
    const r = parseOfferInput({ ...valid, delivery: { enabled: false, text: "Abholung nach Absprache" }, recipient: {} }, catalog);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const order = offerPreviewOrder({ ...tulipOffer(), ...r.offer }, { cardsEnabled: false });
    expect(order.delivery).toMatchObject({ none: true, windowLabel: "Abholung nach Absprache", fee: 0 });
    expect(order.recipient).toMatchObject({ firstName: "Mei", street: "" });
  });

  it("rejects an unknown product and a total below the minimum, and falls back to German", () => {
    const bad = parseOfferInput({ ...valid, items: [{ kind: "product", productId: "nope", sizeId: "m", unitPrice: 1 }] }, catalog);
    expect(bad.ok).toBe(false);
    const zero = parseOfferInput({ ...valid, items: [{ kind: "custom", title: "Gratis", unitPrice: 0 }], extras: [], delivery: { ...valid.delivery, fee: 0 } }, catalog);
    expect(zero.ok).toBe(false);
    const xx = parseOfferInput({ ...valid, locale: "xx" }, catalog);
    expect(xx.ok && xx.offer.locale).toBe("de");
  });
});
