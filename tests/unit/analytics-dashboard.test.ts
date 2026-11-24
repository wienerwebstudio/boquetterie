import { describe, expect, it } from "vitest";
import type { Order } from "@/types";
import { buildDashboard } from "@/lib/analytics-dashboard";
import { deliveredAt, orderCost, paymentFailureCode } from "@/lib/order-metrics";

type Line = Order["lines"][number];
const line = (over: Partial<Line> = {}): Line => ({
  productId: "amour", productName: "Amour", sizeLabel: "M", quantity: 1, unitPrice: 50, extras: [], floristBudget: 20, ...over,
} as Line);

let n = 0;
const order = (over: Partial<Order> = {}): Order => ({
  id: `BQ-T${++n}`, token: "t", createdAt: "2026-11-20T10:00:00.000Z", status: "paid", history: [],
  recipient: { zip: "1040" } as Order["recipient"],
  delivery: { date: "2026-11-21", windowLabel: "12–13 Uhr", windowTo: "13:00", zoneId: "z1", zoneName: "Zone 1", fee: 0 },
  customer: { firstName: "A", lastName: "B", email: `c${n}@example.com`, phone: "1" },
  lines: [line()],
  totals: { subtotal: 50, extras: 0, delivery: 0, discount: 0, total: 50 },
  payment: { method: "card", status: "paid", provider: "stripe" },
  ...over,
});

describe("order metrics", () => {
  it("computes cost, delivery time and failure reasons", () => {
    expect(orderCost({ lines: [line({ quantity: 2, extras: [{ extraId: "v", name: "Vase", quantity: 1, unitPrice: 10, floristBudget: 4 } as Line["extras"][number]] })] })).toEqual({ cost: 44, complete: true });
    expect(orderCost({ lines: [line({ floristBudget: undefined })] })).toEqual({ cost: 0, complete: false });
    expect(deliveredAt({ history: [{ status: "delivered", at: "2026-11-21T11:00:00Z" }] })?.toISOString()).toBe("2026-11-21T11:00:00.000Z");
    const failed = order({ payment: { method: "google_pay", status: "failed" }, history: [{ status: "received", at: "x", note: "card_error · card_declined · insufficient_funds" }] });
    expect(paymentFailureCode(failed)).toBe("insufficient_funds");
    expect(paymentFailureCode(order())).toBeNull();
  });
});

describe("analytics dashboard", () => {
  const orders = [
    order({ analytics: { channel: "chatgpt", referrerDomain: "chatgpt.com" }, locale: "en", status: "delivered", history: [{ status: "delivered", at: "2026-11-21T12:50:00Z" }] }),
    order({ analytics: { channel: "google" }, totals: { subtotal: 100, extras: 0, delivery: 0, discount: 0, total: 100 }, lines: [line({ unitPrice: 100, floristBudget: 40 })] }),
    order({ payment: { method: "google_pay", status: "failed" }, history: [{ status: "received", at: "x", note: "payment_intent_authentication_failure" }] }),
    order({ payment: { method: "card", status: "paid", provider: "mock" } }), // test payment
    order({ createdAt: "2026-09-01T10:00:00.000Z" }), // outside 30 days
    order({ payment: { method: "card", status: "refunded" } }),
  ];
  const d = buildDashboard({ orders, today: "2026-11-24", days: 30 });

  it("counts only real paid orders in the period as revenue", () => {
    expect(d.ceo.revenue).toBe(150);
    expect(d.ceo.paidOrders).toBe(2);
    expect(d.ceo.aov).toBe(75);
    expect(d.ceo.grossProfit).toBe(90);
    expect(d.ceo.grossMargin).toBe(60);
    expect(d.ceo.refunds).toBe(50);
    expect(d.ceo.attempts).toBe(4);
    expect(d.ceo.paymentSuccess).toBe(75);
    expect(d.ceo.series).toHaveLength(30);
    expect(d.ceo.series.find((p) => p.date === "2026-11-20")).toMatchObject({ orders: 2, revenue: 150 });
  });

  it("attributes revenue to channels and languages", () => {
    expect(d.marketing.channels.map((c) => [c.key, c.revenue])).toEqual([["google", 100], ["chatgpt", 50]]);
    expect(d.marketing.referrers[0]).toMatchObject({ key: "chatgpt.com", orders: 1 });
    expect(d.i18n.locales.map((l) => l.key)).toEqual(["de", "en"]);
    expect(d.i18n.nonGermanShare).toBe(50);
  });

  it("explains failed payments and products", () => {
    expect(d.checkout.methods.find((m) => m.method === "google_pay")).toMatchObject({ attempts: 1, paid: 0, success: 0 });
    expect(d.checkout.reasons).toEqual([{ code: "payment_intent_authentication_failure", count: 1 }]);
    expect(d.checkout.customersLost).toBe(1);
    expect(d.products.items[0]).toMatchObject({ id: "amour", qty: 2, revenue: 150, profit: 90, margin: 60 });
  });

  it("measures delivery operations", () => {
    expect(d.ops.delivered).toBe(1);
    // Delivered 13:50 Vienna, window until 13:00 → 50 min late.
    expect(d.ops.onTimeRate).toBe(0);
    expect(d.ops.delays.find((x) => x.bucket === "30-60m")?.count).toBe(1);
    expect(d.ops.districts[0]).toMatchObject({ key: "1040", label: "4. Bezirk (1040)" });
  });

  it("includes everything for 'all time'", () => {
    expect(buildDashboard({ orders, today: "2026-11-24", days: null }).ceo.paidOrders).toBe(3);
  });
});
