import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order, Product } from "@/types";

vi.mock("server-only", () => ({}));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: () => unknown) => void fn() }));

const db = vi.hoisted(() => ({ orders: [] as Order[], products: [] as Product[] }));
vi.mock("@/lib/cms", () => {
  const clone = <T,>(v: T): T => structuredClone(v);
  return {
    getSettings: async () => ({ timezone: "Europe/Vienna", payments: [] }),
    getOrders: async () => clone(db.orders),
    getOrderById: async (id: string) => clone(db.orders.find((o) => o.id === id) ?? null),
    updateOrder: async (id: string, fn: (o: Order) => Order) => { const i = db.orders.findIndex((o) => o.id === id); if (i < 0) return null; db.orders[i] = fn(clone(db.orders[i])); return clone(db.orders[i]); },
    readCollection: async () => clone(db.products),
    writeCollection: async (_name: string, value: Product[]) => { db.products = clone(value); },
  };
});
vi.mock("@/lib/mail", () => ({ sendOrderConfirmation: vi.fn(async () => ({ sent: false })) }));
vi.mock("@/lib/courier", () => ({ bookCourierSafely: vi.fn() }));
vi.mock("@/lib/offers", () => ({ markOfferPaidForOrder: vi.fn(), offerLocale: () => "de", withOfferLock: (_: string, fn: () => unknown) => fn() }));

// Stripe is stubbed: no request ever leaves the test.
const stripe = vi.hoisted(() => ({
  configured: true,
  state: vi.fn(async (intentId: string): Promise<{ status: string; reference?: string; orderId?: string }> => ({ status: "requires_payment_method", orderId: intentId.replace("pi_", "") })),
}));
vi.mock("@/lib/payments", () => ({
  stripeConfigured: () => stripe.configured,
  stripeIntentState: stripe.state,
  providerForMethod: () => "stripe",
  createPayment: vi.fn(),
  resumePayment: vi.fn(),
  cancelOpenPayment: vi.fn(),
  verifyPayment: vi.fn(),
}));

import { expireStaleOrders, isStalePending, lastActivity, STALE_NOTE } from "@/lib/stale-orders";
import { markOrderPaid } from "@/lib/orders";

const NOW = Date.parse("2026-11-20T12:00:00.000Z");
const H = 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

function order(id: string, createdAgoMs: number, payment: Partial<Order["payment"]> = {}, history: Order["history"] = []): Order {
  const createdAt = iso(NOW - createdAgoMs);
  return {
    id, token: "t".repeat(24), createdAt, status: "received", history: [{ status: "received", at: createdAt }, ...history],
    recipient: { firstName: "A", lastName: "B", street: "S", houseNumber: "1", zip: "1040", city: "Wien", phone: "0664 1234567", country: "AT" },
    delivery: { date: "2026-11-24", zoneId: "z", zoneName: "Wien", fee: 0 },
    customer: { firstName: "P", lastName: "M", email: "p@example.com", phone: "0664 7654321" },
    lines: [{ productId: "p-stock", productName: "Stock", sizeId: "m", sizeLabel: "M", quantity: 2, unitPrice: 50, image: "", extras: [] }],
    totals: { subtotal: 100, extras: 0, delivery: 0, discount: 0, total: 100 },
    payment: { method: "card", status: "pending", provider: "stripe", intentId: `pi_${id}`, ...payment },
  } as Order;
}

const stock = () => db.products[0].stock;

beforeEach(() => {
  stripe.configured = true;
  stripe.state.mockReset();
  stripe.state.mockImplementation(async (intentId: string) => ({ status: "requires_payment_method", orderId: intentId.replace("pi_", "") }));
  db.products = [{ id: "p-stock", active: true, stock: 3, sizes: [{ id: "m", label: "M", price: 50 }] } as unknown as Product];
});

describe("stale pending orders", () => {
  it("knows the last activity (creation or newest history entry)", () => {
    const o = order("BQ-A", 3 * H, {}, [{ status: "received", at: iso(NOW - 30 * 60 * 1000), note: "Zahlung nicht abgeschlossen: Kartenangaben unvollständig" }]);
    expect(lastActivity(o)).toBe(NOW - 30 * 60 * 1000);
    expect(isStalePending(o, NOW)).toBe(false);
    expect(isStalePending(order("BQ-B", 2 * H), NOW)).toBe(true);
    expect(isStalePending(order("BQ-C", 2 * H - 1000), NOW)).toBe(false);
    expect(isStalePending(order("BQ-D", 5 * H, { status: "paid" }), NOW)).toBe(false);
  });

  it("marks only old pending orders failed, releases stock once, never touches paid or recent orders", async () => {
    db.orders = [
      order("BQ-OLD", 3 * H),
      order("BQ-NEW", 30 * 60 * 1000),
      order("BQ-PAID", 10 * H, { status: "paid" }),
      order("BQ-FAILED", 10 * H, { status: "failed" }),
      order("BQ-REFUND", 10 * H, { status: "refunded" }),
    ];
    const r = await expireStaleOrders({ now: NOW });
    expect(r.expired).toEqual(["BQ-OLD"]);
    const byId = (id: string) => db.orders.find((o) => o.id === id)!;
    expect(byId("BQ-OLD").payment.status).toBe("failed");
    expect(byId("BQ-OLD").history.at(-1)?.note).toBe(STALE_NOTE);
    expect(byId("BQ-NEW").payment.status).toBe("pending");
    expect(byId("BQ-PAID").payment.status).toBe("paid");
    expect(byId("BQ-FAILED").history).toHaveLength(1);
    expect(byId("BQ-REFUND").payment.status).toBe("refunded");
    expect(stock()).toBe(5);

    // A second run changes nothing (stock released exactly once).
    const again = await expireStaleOrders({ now: NOW });
    expect(again.checked).toBe(0);
    expect(stock()).toBe(5);
  });

  it("asks Stripe first: succeeded → paid instead, processing → left alone, lookup error → retried later", async () => {
    db.orders = [order("BQ-SUCC", 3 * H), order("BQ-PROC", 3 * H), order("BQ-ERR", 3 * H), order("BQ-OPEN", 3 * H)];
    stripe.state.mockImplementation(async (intentId: string) => {
      if (intentId === "pi_BQ-SUCC") return { status: "succeeded", reference: "ch_1", orderId: "BQ-SUCC" };
      if (intentId === "pi_BQ-PROC") return { status: "processing", orderId: "BQ-PROC" };
      if (intentId === "pi_BQ-ERR") throw new Error("network");
      return { status: "requires_payment_method", orderId: "BQ-OPEN" };
    });
    const r = await expireStaleOrders({ now: NOW });
    expect(r.confirmed).toEqual(["BQ-SUCC"]);
    expect(r.expired).toEqual(["BQ-OPEN"]);
    expect(r.skipped.map((s) => s.id).sort()).toEqual(["BQ-ERR", "BQ-PROC"]);
    const byId = (id: string) => db.orders.find((o) => o.id === id)!;
    expect(byId("BQ-SUCC").payment).toMatchObject({ status: "paid", reference: "ch_1" });
    expect(byId("BQ-PROC").payment.status).toBe("pending");
    expect(byId("BQ-ERR").payment.status).toBe("pending");
    expect(stock()).toBe(5); // only BQ-OPEN gave its 2 units back
    expect(stripe.state).toHaveBeenCalledTimes(4);
  });

  it("without Stripe keys (mock, PayPal) it marks failed without asking anyone", async () => {
    stripe.configured = false;
    db.orders = [order("BQ-PP", 3 * H, { provider: "paypal", method: "paypal", intentId: undefined }), order("BQ-ST", 3 * H)];
    const r = await expireStaleOrders({ now: NOW });
    expect(r.expired.sort()).toEqual(["BQ-PP", "BQ-ST"]);
    expect(stripe.state).not.toHaveBeenCalled();
  });

  it("a payment that still arrives later re-reserves the stock", async () => {
    db.orders = [order("BQ-LATE", 3 * H)];
    await expireStaleOrders({ now: NOW });
    expect(stock()).toBe(5);
    await markOrderPaid("BQ-LATE", { provider: "stripe", note: "Zahlung per Stripe bestätigt" });
    expect(db.orders[0].payment.status).toBe("paid");
    expect(stock()).toBe(3);
  });
});

describe("GET /api/cron/stale-orders", () => {
  it("needs the CRON_SECRET and then runs the cleanup", async () => {
    const { GET } = await import("@/app/api/cron/stale-orders/route");
    db.orders = [order("BQ-CRON", 3 * H)];
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(new Request("http://localhost/api/cron/stale-orders"))).status).toBe(503);
    vi.stubEnv("CRON_SECRET", "s3cret-s3cret");
    expect((await GET(new Request("http://localhost/api/cron/stale-orders", { headers: { authorization: "Bearer wrong" } }))).status).toBe(401);
    expect(db.orders[0].payment.status).toBe("pending");
    const res = await GET(new Request("http://localhost/api/cron/stale-orders", { headers: { authorization: "Bearer s3cret-s3cret" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, expired: ["BQ-CRON"] });
    vi.unstubAllEnvs();
  });
});
