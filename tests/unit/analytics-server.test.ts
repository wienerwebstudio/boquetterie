import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/types";

vi.mock("server-only", () => ({}));

let stored: Order;
const claims = new Set<string>();
vi.mock("@/lib/cms", () => ({
  claimOnce: async (name: string) => (claims.has(name) ? false : (claims.add(name), true)),
  getOrderById: async () => structuredClone(stored),
  updateOrder: async (_id: string, patch: (o: Order) => Order) => {
    stored = patch(structuredClone(stored));
    return structuredClone(stored);
  },
}));

const baseOrder = (over: Partial<Order> = {}): Order => ({
  id: "BQ-TEST01", token: "t", createdAt: "2026-11-24T09:00:00.000Z", status: "received", history: [],
  recipient: {} as Order["recipient"],
  delivery: { date: "2026-11-24", windowId: "h12", windowFrom: "12:00", windowTo: "13:00", zoneId: "wien-nah", zoneName: "Zone 1", fee: 0 },
  customer: { firstName: "A", lastName: "B", email: "a@b.c", phone: "1" },
  lines: [{ quantity: 2 } as Order["lines"][number]],
  totals: { subtotal: 79.8, extras: 0, delivery: 0, discount: 0, total: 79.8 },
  payment: { method: "apple_pay", status: "paid" },
  analytics: { channel: "chatgpt", referrerDomain: "chatgpt.com", visitorId: "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90", userAgent: "Mozilla/5.0 (iPhone)" },
  ...over,
});

describe("server-side analytics", () => {
  beforeEach(() => {
    vi.resetModules();
    claims.clear();
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "e425a6a0-76a7-40ad-b6df-74532822210c");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends purchase exactly once with revenue, currency and the visitor id", async () => {
    stored = baseOrder();
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { trackPurchase } = await import("@/lib/analytics-server");
    await Promise.all([trackPurchase("BQ-TEST01"), trackPurchase("BQ-TEST01")]);
    await trackPurchase("BQ-TEST01");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://cloud.umami.is/api/send");
    const body = JSON.parse(String(init.body));
    expect(body.type).toBe("event");
    expect(body.payload).toMatchObject({ name: "purchase", id: "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90", referrer: "https://chatgpt.com/" });
    expect(body.payload.data).toMatchObject({ revenue: 79.8, currency: "EUR", channel: "chatgpt", locale: "de", item_count: 2, delivery_type: "same_day" });
    expect((init.headers as Record<string, string>)["User-Agent"]).toBe("Mozilla/5.0 (iPhone)");
    expect(stored.analytics?.purchaseSentAt).toBeTruthy();
  });

  it("sends nothing without a visitor id (no statistics consent) or without Umami", async () => {
    stored = baseOrder({ analytics: { channel: "google" } });
    const fetchMock = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    const { trackPurchase, trackRefund } = await import("@/lib/analytics-server");
    await trackPurchase("BQ-TEST01");
    await trackRefund("BQ-TEST01");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(stored.analytics?.purchaseSentAt).toBeUndefined();
  });

  it("reports late deliveries with a delay bucket", async () => {
    const { deliveryPunctuality, deliveryType } = await import("@/lib/analytics-server");
    const o = baseOrder();
    expect(deliveryPunctuality(o, new Date("2026-11-24T12:05:00Z"))).toEqual({ onTime: true }); // 13:05 Vienna
    expect(deliveryPunctuality(o, new Date("2026-11-24T12:40:00Z"))).toMatchObject({ onTime: false, delayBucket: "30-60m" });
    expect(deliveryPunctuality(o, new Date("2026-11-24T16:00:00Z"))).toMatchObject({ onTime: false, delayBucket: "2h+" });
    expect(deliveryType(o)).toBe("same_day");
    expect(deliveryType({ ...o, delivery: { ...o.delivery, express: true } })).toBe("express");
    expect(deliveryType({ ...o, delivery: { ...o.delivery, date: "2026-11-27" } })).toBe("scheduled");
  });

  it("keeps only safe attribution from the request", async () => {
    const { orderAnalyticsFromRequest } = await import("@/lib/analytics-server");
    expect(orderAnalyticsFromRequest({ attribution: { channel: "instagram", landing: "/produkt/amour" } }, "UA")).toEqual({ channel: "instagram", landing: "/produkt/amour" });
    expect(orderAnalyticsFromRequest({ attribution: { channel: "google" }, visitorId: "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90" }, "UA")).toEqual({ channel: "google", visitorId: "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90", userAgent: "UA" });
    expect(orderAnalyticsFromRequest(undefined, "UA")).toBeUndefined();
  });
});
