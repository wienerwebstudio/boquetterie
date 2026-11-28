import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Offer, Order } from "@/types";

vi.mock("server-only", () => ({}));

const db = vi.hoisted(() => ({ offers: [] as Offer[], orders: [] as Order[] }));
vi.mock("@/lib/cms", () => {
  const clone = <T,>(v: T): T => structuredClone(v);
  return {
    getSettings: async () => ({ timezone: "Europe/Vienna", blackoutDates: [], greetingCard: { enabled: false }, payments: [{ id: "card", label: "Karte", enabled: true }, { id: "eps", label: "eps", enabled: true }, { id: "paypal", label: "PayPal", enabled: true }] }),
    getDeliveryZones: async () => [],
    getOffers: async () => clone(db.offers),
    getOfferById: async (id: string) => clone(db.offers.find((o) => o.id === id) ?? null),
    updateOffer: async (id: string, fn: (o: Offer) => Offer) => { const i = db.offers.findIndex((o) => o.id === id); db.offers[i] = fn(clone(db.offers[i])); return clone(db.offers[i]); },
    getOrders: async () => clone(db.orders),
    getOrderById: async (id: string) => clone(db.orders.find((o) => o.id === id) ?? null),
    addOrder: async (o: Order) => { db.orders.unshift(clone(o)); return o; },
    updateOrder: async (id: string, fn: (o: Order) => Order) => { const i = db.orders.findIndex((o) => o.id === id); if (i < 0) return null; db.orders[i] = fn(clone(db.orders[i])); return clone(db.orders[i]); },
    readCollection: async () => [],
    writeCollection: async () => undefined,
  };
});
vi.mock("@/lib/mail", () => ({ sendOrderConfirmation: vi.fn(async () => ({ sent: false })) }));
vi.mock("@/lib/courier", () => ({ bookCourierSafely: vi.fn() }));
vi.mock("@/lib/florist-budget", () => ({ EMPTY_BUDGETS: { products: {}, extras: {} }, getFloristBudgets: async () => ({ products: {}, extras: {} }), attachFloristBudgets: (l: unknown) => l }));

/* Stripe-like provider: every new order gets an open PaymentIntent. */
const pay = vi.hoisted(() => ({
  create: vi.fn(async ({ order }: { order: Order }) => (order.payment.provider === "paypal"
    ? { status: "pending", provider: "paypal", intentId: `pp_${order.id}`, approveUrl: `https://paypal.test/${order.id}` }
    : { status: "pending", provider: "stripe", intentId: `pi_${order.id}`, clientSecret: `cs_${order.id}` })),
  resume: vi.fn(async ({ order }: { order: Order }) => ({ status: "pending", provider: "stripe", intentId: order.payment.intentId, clientSecret: `cs_${order.id}` })),
  cancel: vi.fn(async () => undefined),
  verify: vi.fn(async () => ({ status: "pending" })),
}));
vi.mock("@/lib/payments", () => ({
  providerForMethod: (m: string) => (m === "paypal" ? "paypal" : "stripe"),
  createPayment: pay.create,
  resumePayment: pay.resume,
  cancelOpenPayment: pay.cancel,
  verifyPayment: pay.verify,
}));

import { createOrderFromOffer, markOrderPaid } from "@/lib/orders";

const base: Offer = {
  id: "AN-IDEM01", token: "T".repeat(32), createdAt: "2026-01-01T09:00:00.000Z", updatedAt: "2026-01-01T09:00:00.000Z", status: "sent", locale: "de",
  customer: { firstName: "Mei", lastName: "Lin", email: "mei@example.com" },
  items: [{ id: "i1", kind: "custom", title: "Rosa Tulpen", quantity: 1, unitPrice: 79 }], extras: [],
  delivery: { enabled: true, date: "2026-11-29", from: "14:00", to: "16:00", fee: 9.9 },
  recipient: { kind: "address", firstName: "Mei", lastName: "Lin", phone: "", street: "Universitätsring", houseNumber: "2", zip: "1010", city: "Wien" },
  validUntil: "2099-12-31", history: [],
};

beforeEach(() => {
  db.offers = [structuredClone(base)];
  db.orders = [];
  Object.values(pay).forEach((f) => f.mockClear());
});

describe("idempotent payment start", () => {
  it("reuses the open order and PaymentIntent, also when switching between Stripe methods", async () => {
    const first = await createOrderFromOffer(base.id, "card", { siteUrl: "x" });
    const second = await createOrderFromOffer(base.id, "eps", { siteUrl: "x" });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.reused).toBe(true);
    expect(second.order.id).toBe(first.order.id);
    expect(second.payment.clientSecret).toBe(first.payment.clientSecret);
    expect(db.orders).toHaveLength(1);
    expect(db.orders[0].payment.method).toBe("eps");
    expect(pay.create).toHaveBeenCalledTimes(1);
  });

  it("cancels the open payment before a new order when the offer was edited", async () => {
    const first = await createOrderFromOffer(base.id, "card", { siteUrl: "x" });
    db.offers[0] = { ...db.offers[0], items: [{ ...base.items[0], unitPrice: 89 }], updatedAt: new Date(Date.now() + 1000).toISOString() };
    const second = await createOrderFromOffer(base.id, "card", { siteUrl: "x" });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.order.id).not.toBe(first.order.id);
    expect(second.order.totals.total).toBe(98.9);
    expect(pay.cancel).toHaveBeenCalledTimes(1);
    expect(db.orders.find((o) => o.id === first.order.id)?.payment.status).toBe("failed");
    expect(db.offers[0].orderId).toBe(second.order.id);
  });

  it("switching to PayPal cancels the Stripe intent; an already paid intent ends it", async () => {
    await createOrderFromOffer(base.id, "card", { siteUrl: "x" });
    const pp = await createOrderFromOffer(base.id, "paypal", { siteUrl: "x" });
    expect(pp.ok && pp.payment.approveUrl).toBeTruthy();
    expect(pay.cancel).toHaveBeenCalledTimes(1);

    // The customer paid the PayPal order meanwhile: offer is paid, no further order.
    if (!pp.ok) return;
    await markOrderPaid(pp.order.id, { provider: "paypal", reference: "cap_1" });
    expect(db.offers[0].status).toBe("paid");
    expect(await createOrderFromOffer(base.id, "card", { siteUrl: "x" })).toMatchObject({ ok: false, code: "paid" });
    expect(db.orders).toHaveLength(2);
  });

  it("never starts a second payment while the state of the open one is unknown", async () => {
    await createOrderFromOffer(base.id, "card", { siteUrl: "x" });
    pay.resume.mockRejectedValueOnce(new Error("stripe down"));
    expect(await createOrderFromOffer(base.id, "card", { siteUrl: "x" })).toMatchObject({ ok: false, code: "payment" });
    expect(db.orders).toHaveLength(1);
  });
});
