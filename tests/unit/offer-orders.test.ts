import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Offer, Order } from "@/types";

vi.mock("server-only", () => ({}));

/* In-memory datastore behind the cms facade. */
const db = vi.hoisted(() => ({ offers: [] as Offer[], orders: [] as Order[], productWrites: 0 }));
const settings = vi.hoisted(() => ({
  timezone: "Europe/Vienna",
  blackoutDates: [] as string[],
  greetingCard: { enabled: false, maxChars: 200, freeCardIncluded: true },
  payments: [{ id: "card", label: "Kreditkarte", enabled: true, provider: "mock" }],
  seo: { siteUrl: "https://blumora.at" },
}));
vi.mock("@/lib/cms", () => {
  const clone = <T,>(v: T): T => structuredClone(v);
  return {
    getSettings: async () => clone(settings),
    getDeliveryZones: async () => [{ id: "wien-zentrum", name: "Wien Zentrum", postalCodes: ["1010-1090"], fee: 7.9, freeFrom: null, minOrder: 0, deliveryDays: [1, 2, 3, 4, 5, 6], active: true, windows: [] }],
    getOffers: async () => clone(db.offers),
    getOfferById: async (id: string) => clone(db.offers.find((o) => o.id === id) ?? null),
    addOffer: async (o: Offer) => { db.offers.unshift(clone(o)); return o; },
    updateOffer: async (id: string, fn: (o: Offer) => Offer) => {
      const i = db.offers.findIndex((o) => o.id === id);
      if (i < 0) return null;
      db.offers[i] = fn(clone(db.offers[i]));
      return clone(db.offers[i]);
    },
    getOrders: async () => clone(db.orders),
    getOrderById: async (id: string) => clone(db.orders.find((o) => o.id === id) ?? null),
    addOrder: async (o: Order) => { db.orders.unshift(clone(o)); return o; },
    updateOrder: async (id: string, fn: (o: Order) => Order) => {
      const i = db.orders.findIndex((o) => o.id === id);
      if (i < 0) return null;
      db.orders[i] = fn(clone(db.orders[i]));
      return clone(db.orders[i]);
    },
    readCollection: async () => [],
    writeCollection: async () => { db.productWrites++; },
    getAllProducts: async () => [],
    getExtras: async () => [],
    getCoupons: async () => [],
  };
});
const mails = vi.hoisted(() => ({ confirmation: vi.fn(async () => ({ sent: false, provider: "console" })) }));
vi.mock("@/lib/mail", () => ({ sendOrderConfirmation: mails.confirmation }));
const courier = vi.hoisted(() => ({ book: vi.fn(async () => undefined) }));
vi.mock("@/lib/courier", () => ({ bookCourierSafely: courier.book }));
vi.mock("@/lib/florist-budget", () => ({
  EMPTY_BUDGETS: { products: {}, extras: {} },
  getFloristBudgets: async () => ({ products: {}, extras: { "x-card": 2 } }),
  attachFloristBudgets: (l: unknown) => l,
}));

import { createOrderFromOffer } from "@/lib/orders";
import { findOfferByToken, newOfferToken, OFFER_TOKEN_PATTERN } from "@/lib/offers";
import { POST as pay } from "@/app/api/offers/pay/route";
import { rateLimitInternals } from "@/lib/rate-limit";

const TOKEN = "TaiwanTulips_0123456789abcdefghi";

function offer(over: Partial<Offer> = {}): Offer {
  return {
    id: "AN-TULIP1", token: TOKEN, createdAt: "2026-01-01T09:00:00.000Z", updatedAt: "2026-01-01T09:00:00.000Z",
    status: "sent", locale: "en",
    customer: { firstName: "Mei", lastName: "Lin", email: "mei@example.com" },
    items: [{ id: "i1", kind: "custom", title: "Bouquet of pink tulips", description: "Only pink tulips", image: "/media/tulips.jpg", quantity: 1, unitPrice: 79 }],
    extras: [{ extraId: "x-card", name: "Karte", quantity: 2, unitPrice: 4.5 }],
    delivery: { enabled: true, date: "2026-11-29", from: "14:00", to: "16:00", fee: 9.9 },
    recipient: { kind: "meeting", firstName: "Mei", lastName: "Lin", phone: "+886 912 345 678", street: "Universitätsring", houseNumber: "2", addition: "Haupteingang Burgtheater", zip: "1010", city: "Wien" },
    floristNote: "Nur rosa!",
    billing: { company: "Lin Trading", street: "Xinyi Rd 1", zip: "110", city: "Taipei", country: "Taiwan", vatId: "TW123" },
    validUntil: "2099-12-31",
    history: [],
    ...over,
  };
}

beforeEach(() => {
  db.offers = [offer()];
  db.orders = [];
  db.productWrites = 0;
  mails.confirmation.mockClear();
  courier.book.mockClear();
  rateLimitInternals.clear();
});

describe("createOrderFromOffer", () => {
  it("creates a paid order with custom lines and amounts only from the offer", async () => {
    const res = await createOrderFromOffer("AN-TULIP1", "card", { siteUrl: "http://localhost:3000" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const order = db.orders[0];
    expect(order.payment).toMatchObject({ status: "paid", provider: "mock", method: "card" });
    expect(order.totals).toEqual({ subtotal: 79, extras: 9, delivery: 9.9, discount: 0, total: 97.9 });
    expect(order.lines[0]).toMatchObject({ productId: "custom", custom: true, productName: "Bouquet of pink tulips", description: "Only pink tulips", image: "/media/tulips.jpg", sizeLabel: "" });
    expect(order.lines[0].extras[0]).toMatchObject({ extraId: "x-card", quantity: 2, unitPrice: 4.5, floristBudget: 2 });
    expect(order.delivery).toMatchObject({ date: "2026-11-29", windowLabel: "14:00–16:00 Uhr", windowFrom: "14:00", windowTo: "16:00", zoneId: "wien-zentrum", fee: 9.9 });
    expect(order.recipient.addition).toBe("Treffpunkt: Haupteingang Burgtheater");
    expect(order).toMatchObject({ locale: "en", offerId: "AN-TULIP1", floristNote: "Nur rosa!", billing: { vatId: "TW123" } });
    expect(order.partner).toBeUndefined();
    // No stock for custom items, no automatic courier, the usual mails.
    expect(db.productWrites).toBe(0);
    expect(courier.book).not.toHaveBeenCalled();
    expect(mails.confirmation).toHaveBeenCalledTimes(1);
    expect(db.offers[0]).toMatchObject({ status: "paid", orderId: order.id });
  });

  it("cannot be paid twice", async () => {
    await createOrderFromOffer("AN-TULIP1", "card", { siteUrl: "http://localhost:3000" });
    const again = await createOrderFromOffer("AN-TULIP1", "card", { siteUrl: "http://localhost:3000" });
    expect(again).toMatchObject({ ok: false, status: 409, code: "paid" });
    expect(db.orders).toHaveLength(1);
  });

  it("serialises concurrent clicks into one payment", async () => {
    const [a, b] = await Promise.all([
      createOrderFromOffer("AN-TULIP1", "card", { siteUrl: "x" }),
      createOrderFromOffer("AN-TULIP1", "card", { siteUrl: "x" }),
    ]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    expect(db.orders.filter((o) => o.payment.status === "paid")).toHaveLength(1);
  });

  it("refuses drafts, expired and cancelled offers and unknown methods", async () => {
    db.offers = [offer({ status: "draft" })];
    expect(await createOrderFromOffer("AN-TULIP1", "card", { siteUrl: "x" })).toMatchObject({ ok: false, code: "unavailable" });
    db.offers = [offer({ validUntil: "2020-01-01" })];
    expect(await createOrderFromOffer("AN-TULIP1", "card", { siteUrl: "x" })).toMatchObject({ ok: false, code: "unavailable" });
    db.offers = [offer({ status: "cancelled" })];
    expect(await createOrderFromOffer("AN-TULIP1", "card", { siteUrl: "x" })).toMatchObject({ ok: false, code: "unavailable" });
    db.offers = [offer()];
    expect(await createOrderFromOffer("AN-TULIP1", "paypal", { siteUrl: "x" })).toMatchObject({ ok: false, code: "method" });
    expect(db.orders).toHaveLength(0);
  });

  it("makes an order without delivery 'as arranged' and outside every zone", async () => {
    db.offers = [offer({ delivery: { enabled: false, date: "", from: "", to: "", text: "Abholung im Atelier", fee: 0 } })];
    const res = await createOrderFromOffer("AN-TULIP1", "card", { siteUrl: "x" });
    expect(res.ok).toBe(true);
    expect(db.orders[0].delivery).toMatchObject({ none: true, windowLabel: "Abholung im Atelier", fee: 0, zoneId: "angebot" });
    expect(db.orders[0].totals.total).toBe(88);
  });
});

describe("offer tokens", () => {
  it("are long, url-safe and found only exactly", async () => {
    const t = newOfferToken();
    expect(t).toMatch(OFFER_TOKEN_PATTERN);
    expect(newOfferToken()).not.toBe(t);
    expect((await findOfferByToken(TOKEN))?.id).toBe("AN-TULIP1");
    expect(await findOfferByToken(TOKEN.slice(0, -1) + "x")).toBeNull();
    expect(await findOfferByToken(TOKEN.slice(0, 10))).toBeNull();
    expect(await findOfferByToken("../../etc/passwd")).toBeNull();
    expect(await findOfferByToken(undefined)).toBeNull();
  });
});

describe("POST /api/offers/pay", () => {
  const call = (body: unknown) => pay(new Request("http://localhost:3000/api/offers/pay", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.9" }, body: JSON.stringify(body) }));

  it("needs the terms, a method and a valid token – and ignores amounts from the client", async () => {
    expect((await call({ token: TOKEN, method: "card" })).status).toBe(400);
    expect((await call({ token: TOKEN, method: "bitcoin", acceptedTerms: true })).status).toBe(400);
    expect((await call({ token: "x".repeat(32), method: "card", acceptedTerms: true })).status).toBe(404);
    const ok = await call({ token: TOKEN, method: "card", acceptedTerms: true, total: 1, amount: 1 });
    expect(ok.status).toBe(201);
    const body = await ok.json();
    expect(body).toMatchObject({ ok: true, payment: { provider: "mock", status: "paid" } });
    expect(db.orders[0].totals.total).toBe(97.9);
    expect((await call({ token: TOKEN, method: "card", acceptedTerms: true })).status).toBe(409);
  });

  it("is rate limited", async () => {
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await call({ token: "y".repeat(32), method: "card", acceptedTerms: true })).status;
    expect(last).toBe(429);
  });
});
