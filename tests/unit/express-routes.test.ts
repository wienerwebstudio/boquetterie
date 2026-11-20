import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order, SiteSettings } from "@/types";
import settingsJson from "../../content/settings.json";
import { products, zones } from "./fixtures";
import { getAvailableDays, getLocalNow } from "@/lib/delivery";

vi.mock("server-only", () => ({}));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: () => unknown) => void fn() }));

const db = vi.hoisted(() => ({ orders: [] as Order[] }));
vi.mock("@/lib/cms", async () => {
  const fx = await import("./fixtures");
  const s = (await import("../../content/settings.json")).default;
  const clone = <T,>(v: T): T => structuredClone(v);
  return {
    getSettings: async () => clone(s),
    getAllProducts: async () => clone(fx.products),
    getExtras: async () => [],
    getDeliveryZones: async () => clone(fx.zones),
    getCoupons: async () => [],
    getOrders: async () => clone(db.orders),
    getOrderById: async (id: string) => clone(db.orders.find((o) => o.id === id) ?? null),
    addOrder: async (o: Order) => { db.orders.unshift(clone(o)); return o; },
    updateOrder: async (id: string, fn: (o: Order) => Order) => { const i = db.orders.findIndex((o) => o.id === id); if (i < 0) return null; db.orders[i] = fn(clone(db.orders[i])); return clone(db.orders[i]); },
    readCollection: async () => clone(fx.products),
    writeCollection: async () => undefined,
    getOfferById: async () => null,
    updateOffer: async () => null,
  };
});
vi.mock("@/lib/mail", () => ({ sendOrderConfirmation: vi.fn(async () => ({ sent: false })) }));
vi.mock("@/lib/courier", () => ({ bookCourierSafely: vi.fn() }));
vi.mock("@/lib/newsletter", () => ({ subscribeFromCheckout: vi.fn(async () => undefined) }));
vi.mock("@/lib/florist-budget", () => ({ EMPTY_BUDGETS: { products: {}, extras: {} }, getFloristBudgets: async () => ({ products: {}, extras: {} }), attachFloristBudgets: (l: unknown) => l }));
/* Stripe stand-in: no network, no real PaymentIntent. */
const pay = vi.hoisted(() => ({ create: vi.fn(async ({ order }: { order: Order }) => ({ status: "pending", provider: "stripe", intentId: `pi_${order.id}`, clientSecret: `cs_${order.id}` })) }));
vi.mock("@/lib/payments", () => ({
  providerForMethod: (m: string) => (m === "paypal" ? null : "stripe"),
  stripeConfigured: () => true,
  createPayment: pay.create,
  resumePayment: vi.fn(),
  cancelOpenPayment: vi.fn(),
  verifyPayment: vi.fn(),
  resolveSiteUrl: () => "http://localhost:3000",
}));

import { POST as quote } from "@/app/api/express/quote/route";
import { POST as expressOrder } from "@/app/api/express/order/route";

const settings = settingsJson as unknown as SiteSettings;
const amour = products.find((p) => p.slug === "amour")!;
const zone = zones.find((z) => z.id === "wien-zentrum")!;
const days = getAvailableDays({ zone, settings, now: getLocalNow(settings.timezone), product: { sameDayCapable: amour.sameDayCapable, deliverable: true } });
const day = days.find((d) => d.windows.length > 0)!;
const items = [{ productId: amour.id, sizeId: "m", quantity: 1, extras: [] }];
let ip = 0;
const post = (body: unknown) => new Request("http://localhost/api/x", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `10.9.0.${++ip}` }, body: JSON.stringify(body) });

beforeEach(() => { db.orders = []; pay.create.mockClear(); });
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/express/quote", () => {
  it("prices the slot server-side: goods + delivery = total", async () => {
    const res = await quote(post({ items, postalCode: "1040", date: day.date, windowId: day.windows[0].id }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.postalCode).toBe("1040");
    expect(Math.round((body.goods + body.delivery) * 100)).toBe(Math.round(body.total * 100));
    expect(body.goods).toBe(amour.sizes.find((s) => s.id === "m")!.price);
  });

  it("rejects a PLZ outside the delivery zones with code zone", async () => {
    const res = await quote(post({ items, postalCode: "8010", date: day.date, windowId: day.windows[0].id }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, code: "zone" });
  });

  it("rejects an unavailable day or window", async () => {
    expect(await (await quote(post({ items, postalCode: "1040", date: "2000-01-01" }))).json()).toMatchObject({ ok: false, code: "date" });
    expect(await (await quote(post({ items, postalCode: "1040", date: day.date, windowId: "nope" }))).json()).toMatchObject({ ok: false, code: "window" });
  });

  it("ignores client prices – an invented item is refused", async () => {
    const res = await quote(post({ items: [{ productId: "p-fake", sizeId: "m", quantity: 1, extras: [], price: 0.01 }], postalCode: "1040", date: day.date }));
    expect(await res.json()).toMatchObject({ ok: false, code: "items" });
  });
});

describe("POST /api/express/order", () => {
  const wallet = {
    expressPaymentType: "google_pay",
    billingDetails: { name: "Paul Maier", email: "paul.maier@example.com", phone: "+43 664 7654321" },
    shippingAddress: { name: "Anna Huber", address: { line1: "Wiedner Hauptstraße 12", line2: "Top 4", city: "Wien", postal_code: "1040", country: "AT" } },
  };

  it("creates the order from cart + wallet with the checkout's rules and returns the client secret", async () => {
    const res = await expressOrder(post({ items, delivery: { date: day.date, windowId: day.windows[0].id }, wallet, acceptedTerms: true, locale: "en" }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body).toMatchObject({ ok: true, payment: { provider: "stripe", status: "pending" } });
    expect(body.payment.clientSecret).toBe(`cs_${body.id}`);
    const stored = db.orders[0];
    expect(stored.customer).toMatchObject({ firstName: "Paul", lastName: "Maier", email: "paul.maier@example.com" });
    expect(stored.recipient).toMatchObject({ firstName: "Anna", lastName: "Huber", street: "Wiedner Hauptstraße", houseNumber: "12", addition: "Top 4", zip: "1040" });
    expect(stored.payment.method).toBe("google_pay");
    expect(stored.locale).toBe("en");
    expect(body.total).toBe(stored.totals.total);
  });

  it("refuses foreign countries, missing consent and unsupported PLZ – no order", async () => {
    const abroad = { ...wallet, shippingAddress: { ...wallet.shippingAddress, address: { ...wallet.shippingAddress.address, country: "DE" } } };
    expect((await expressOrder(post({ items, delivery: { date: day.date }, wallet: abroad, acceptedTerms: true }))).status).toBe(400);
    expect((await expressOrder(post({ items, delivery: { date: day.date }, wallet }))).status).toBe(400);
    const graz = { ...wallet, shippingAddress: { ...wallet.shippingAddress, address: { ...wallet.shippingAddress.address, postal_code: "8010" } } };
    const res = await expressOrder(post({ items, delivery: { date: day.date, windowId: day.windows[0].id }, wallet: graz, acceptedTerms: true }));
    expect(res.status).toBe(400);
    expect((await res.json()).errors).toHaveProperty(["recipient.zip"]);
    expect(db.orders).toHaveLength(0);
    expect(pay.create).not.toHaveBeenCalled();
  });
});
