import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/types";

vi.mock("server-only", () => ({}));

const db = vi.hoisted(() => ({ orders: [] as Order[] }));
vi.mock("@/lib/cms", () => {
  const clone = <T,>(v: T): T => structuredClone(v);
  return {
    getSettings: async () => ({ timezone: "Europe/Vienna", blackoutDates: [], greetingCard: { enabled: false }, payments: [{ id: "card", label: "Karte", enabled: true }, { id: "eps", label: "eps", enabled: true }, { id: "paypal", label: "PayPal", enabled: true }, { id: "klarna", label: "Klarna", enabled: false }] }),
    getOrders: async () => clone(db.orders),
    getOrderById: async (id: string) => clone(db.orders.find((o) => o.id === id) ?? null),
    updateOrder: async (id: string, fn: (o: Order) => Order) => { const i = db.orders.findIndex((o) => o.id === id); if (i < 0) return null; db.orders[i] = fn(clone(db.orders[i])); return clone(db.orders[i]); },
    readCollection: async () => [],
    writeCollection: async () => undefined,
  };
});
vi.mock("@/lib/mail", () => ({ sendOrderConfirmation: vi.fn(async () => ({ sent: false })) }));
vi.mock("@/lib/courier", () => ({ bookCourierSafely: vi.fn() }));
vi.mock("@/lib/offers", () => ({ markOfferPaidForOrder: vi.fn(), offerLocale: () => "de", withOfferLock: (_: string, fn: () => unknown) => fn() }));

const pay = vi.hoisted(() => ({
  resume: vi.fn(async ({ order }: { order: Order }) => ({ status: "pending", provider: "stripe", intentId: order.payment.intentId, clientSecret: `cs_${order.id}` }) as Record<string, unknown>),
}));
vi.mock("@/lib/payments", () => ({
  providerForMethod: (m: string) => (m === "paypal" ? "paypal" : "stripe"),
  createPayment: vi.fn(),
  resumePayment: pay.resume,
  cancelOpenPayment: vi.fn(),
  verifyPayment: vi.fn(),
}));

import { resumeCheckoutOrder } from "@/lib/orders";

const TOKEN = "a".repeat(24);
const order: Order = {
  id: "BQ-RESUME", token: TOKEN, createdAt: "2026-11-20T09:00:00.000Z", status: "received", history: [{ status: "received", at: "2026-11-20T09:00:00.000Z" }],
  recipient: { firstName: "Anna", lastName: "Huber", street: "Wiedner Hauptstraße", houseNumber: "12", zip: "1040", city: "Wien", phone: "+43 664 1234567", country: "AT" },
  delivery: { date: "2026-11-24", zoneId: "z", zoneName: "Wien", fee: 9.9 },
  customer: { firstName: "Paul", lastName: "Maier", email: "paul@example.com", phone: "0664 7654321" },
  lines: [{ productId: "p-amour", productName: "Amour", sizeId: "m", sizeLabel: "Medium", quantity: 1, unitPrice: 64.9, image: "", extras: [] }],
  totals: { subtotal: 64.9, extras: 0, delivery: 9.9, discount: 0, total: 74.8 },
  payment: { method: "card", status: "pending", provider: "stripe", intentId: "pi_resume" },
} as Order;

beforeEach(() => {
  db.orders = [structuredClone(order)];
  pay.resume.mockClear();
});

describe("retrying a checkout payment continues the open order", () => {
  it("returns the same PaymentIntent and stores a changed method – no new order", async () => {
    const r = await resumeCheckoutOrder(order.id, TOKEN, "eps", { siteUrl: "x" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order.id).toBe(order.id);
    expect(r.payment.clientSecret).toBe(`cs_${order.id}`);
    expect(db.orders).toHaveLength(1);
    expect(db.orders[0].payment.method).toBe("eps");
    expect(r.order.totals.total).toBe(74.8);
  });

  it("refuses a wrong token, offer orders, disabled or non-Stripe methods", async () => {
    expect(await resumeCheckoutOrder(order.id, "b".repeat(24), "card", { siteUrl: "x" })).toMatchObject({ ok: false, code: "not_found" });
    expect(await resumeCheckoutOrder(order.id, "short", "card", { siteUrl: "x" })).toMatchObject({ ok: false, code: "not_found" });
    expect(await resumeCheckoutOrder(order.id, TOKEN, "paypal", { siteUrl: "x" })).toMatchObject({ ok: false, code: "method" });
    expect(await resumeCheckoutOrder(order.id, TOKEN, "klarna", { siteUrl: "x" })).toMatchObject({ ok: false, code: "method" });
    db.orders[0].offerId = "AN-1";
    expect(await resumeCheckoutOrder(order.id, TOKEN, "card", { siteUrl: "x" })).toMatchObject({ ok: false, code: "not_found" });
    expect(pay.resume).not.toHaveBeenCalled();
  });

  it("starts over (gone) when the payment already failed", async () => {
    db.orders[0].payment.status = "failed";
    expect(await resumeCheckoutOrder(order.id, TOKEN, "card", { siteUrl: "x" })).toMatchObject({ ok: false, code: "gone" });
  });

  it("marks the old order failed when its intent can no longer be paid", async () => {
    pay.resume.mockResolvedValueOnce({ status: "failed", provider: "stripe", intentId: "pi_resume", message: "abgebrochen" });
    expect(await resumeCheckoutOrder(order.id, TOKEN, "card", { siteUrl: "x" })).toMatchObject({ ok: false, code: "gone" });
    expect(db.orders[0].payment.status).toBe("failed");
  });

  it("settles an intent that was paid meanwhile instead of charging again", async () => {
    pay.resume.mockResolvedValueOnce({ status: "paid", provider: "stripe", intentId: "pi_resume", reference: "ch_1" });
    const r = await resumeCheckoutOrder(order.id, TOKEN, "card", { siteUrl: "x" });
    expect(r.ok && r.payment.status).toBe("paid");
    expect(db.orders[0].payment.status).toBe("paid");
  });
});
