import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckoutDraft, Order, SiteSettings } from "@/types";
import settingsJson from "../../content/settings.json";
import { products, zones } from "./fixtures";
import { getAvailableDays, getLocalNow } from "@/lib/delivery";

vi.mock("server-only", () => ({}));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: () => unknown) => void fn() }));

const db = vi.hoisted(() => ({ orders: [] as Order[], drafts: [] as CheckoutDraft[], draftWrites: 0 }));
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
    getCheckoutDrafts: async () => clone(db.drafts),
    saveCheckoutDrafts: async (list: CheckoutDraft[]) => { db.draftWrites++; db.drafts = clone(list); },
  };
});
vi.mock("@/lib/mail", () => ({ sendOrderConfirmation: vi.fn(async () => ({ sent: false })) }));
vi.mock("@/lib/courier", () => ({ bookCourierSafely: vi.fn() }));
vi.mock("@/lib/newsletter", () => ({ subscribeFromCheckout: vi.fn(async () => undefined) }));
vi.mock("@/lib/florist-budget", () => ({ EMPTY_BUDGETS: { products: {}, extras: {} }, getFloristBudgets: async () => ({ products: {}, extras: {} }), attachFloristBudgets: (l: unknown) => l }));
vi.mock("@/lib/payments", () => ({
  providerForMethod: () => "stripe",
  stripeConfigured: () => true,
  createPayment: vi.fn(async ({ order }: { order: Order }) => ({ status: "pending", provider: "stripe", intentId: `pi_${order.id}`, clientSecret: `cs_${order.id}` })),
  resumePayment: vi.fn(),
  cancelOpenPayment: vi.fn(),
  verifyPayment: vi.fn(),
  resolveSiteUrl: () => "http://localhost:3000",
}));

import { POST as saveDraft } from "@/app/api/checkout/draft/route";
import { POST as createOrder } from "@/app/api/orders/route";
import { POST as expressOrder } from "@/app/api/express/order/route";
import { DRAFT_TTL_MS, MAX_DRAFTS, deleteCheckoutDraft, listCheckoutDrafts, parseDraftInput, pruneCheckoutDrafts, pruneDrafts } from "@/lib/checkout-drafts";

const settings = settingsJson as unknown as SiteSettings;
const amour = products.find((p) => p.slug === "amour")!;
const zone = zones.find((z) => z.id === "wien-zentrum")!;
const days = getAvailableDays({ zone, settings, now: getLocalNow(settings.timezone), product: { sameDayCapable: amour.sameDayCapable, deliverable: true } });
const day = days.find((d) => d.windows.length > 0)!;
const items = [{ productId: amour.id, sizeId: "m", quantity: 2, extras: [], message: "Alles Liebe" }];
const ID = "d1f0c2b3a4e5f60718293a4b5c6d7e8f";
const contact = { firstName: "Paul", lastName: "Maier", email: "paul.maier@example.com", phone: "0664 7654321" };
const recipient = { firstName: "Anna", lastName: "Huber", street: "Wiedner Hauptstraße", houseNumber: "12", zip: "1040", city: "Wien", phone: "+43 664 1234567" };
const draftBody = { id: ID, source: "checkout", step: 5, locale: "en", items, contact, recipient, delivery: { date: day.date, windowId: day.windows[0].id } };

let ip = 0;
const post = (body: unknown, raw?: string) => new Request("http://localhost/api/x", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `10.7.0.${++ip % 250}` }, body: raw ?? JSON.stringify(body) });

beforeEach(() => { db.orders = []; db.drafts = []; db.draftWrites = 0; });

describe("parseDraftInput", () => {
  it("needs a valid e-mail OR phone for checkout drafts", () => {
    expect(parseDraftInput({ ...draftBody, contact: { ...contact, email: "nope", phone: "12" } })).toMatchObject({ ok: false, message: "contact" });
    const phoneOnly = parseDraftInput({ ...draftBody, contact: { ...contact, email: "nope" } });
    expect(phoneOnly.ok && "input" in phoneOnly && phoneOnly.input.contact).toMatchObject({ email: "", phone: "0664 7654321" });
    const emailOnly = parseDraftInput({ ...draftBody, contact: { ...contact, phone: "" } });
    expect(emailOnly.ok && "input" in emailOnly && emailOnly.input.contact?.email).toBe("paul.maier@example.com");
  });

  it("accepts express drafts without contact data, refuses bad ids, items and sources", () => {
    const express = parseDraftInput({ id: ID, source: "express", items, express: { wallet: "apple_pay", postalCode: "1040", city: "Wien", country: "at" } });
    expect(express.ok && "input" in express && express.input).toMatchObject({ source: "express", express: { wallet: "apple_pay", postalCode: "1040", country: "AT" } });
    expect(express.ok && "input" in express && express.input.contact).toBeUndefined();
    expect(parseDraftInput({ ...draftBody, id: "short" })).toMatchObject({ ok: false, message: "id" });
    expect(parseDraftInput({ ...draftBody, id: "../../etc/passwd-xxxxxxxxxxxx" })).toMatchObject({ ok: false, message: "id" });
    expect(parseDraftInput({ ...draftBody, items: [] })).toMatchObject({ ok: false, message: "items" });
    expect(parseDraftInput({ ...draftBody, source: "admin" })).toMatchObject({ ok: false, message: "source" });
    expect(parseDraftInput("x")).toMatchObject({ ok: false });
  });

  it("ignores a filled honeypot and drops greeting texts", () => {
    expect(parseDraftInput({ ...draftBody, website: "http://spam" })).toEqual({ ok: true, ignored: true });
    const r = parseDraftInput(draftBody);
    expect(r.ok && "input" in r && r.input.items[0].message).toBeUndefined();
  });
});

describe("POST /api/checkout/draft", () => {
  it("stores a snapshot with catalog names and the server total, upserted by id", async () => {
    const res = await saveDraft(post({ ...draftBody, items: [{ ...items[0], productId: amour.id }] }));
    expect(res.status).toBe(200);
    expect(db.drafts).toHaveLength(1);
    const d = db.drafts[0];
    const size = amour.sizes.find((s) => s.id === "m")!;
    expect(d).toMatchObject({ id: ID, source: "checkout", locale: "en", contact, recipient: { zip: "1040", street: "Wiedner Hauptstraße" }, totalComplete: true });
    expect(d.lines[0]).toMatchObject({ productId: amour.id, name: amour.name, sizeLabel: size.label, quantity: 2, unitPrice: size.price });
    expect(d.delivery).toMatchObject({ date: day.date, windowId: day.windows[0].id, windowLabel: day.windows[0].label });
    expect(d.totalEstimate).toBeGreaterThan(size.price * 2 - 0.001);

    const created = d.createdAt;
    await saveDraft(post({ ...draftBody, contact: { ...contact, phone: "0664 1111111" } }));
    expect(db.drafts).toHaveLength(1);
    expect(db.drafts[0].contact?.phone).toBe("0664 1111111");
    expect(db.drafts[0].createdAt).toBe(created);
  });

  it("falls back to the goods total when zone or day are unknown", async () => {
    await saveDraft(post({ ...draftBody, delivery: undefined }));
    expect(db.drafts[0]).toMatchObject({ totalComplete: false, totalEstimate: amour.sizes.find((s) => s.id === "m")!.price * 2 });
  });

  it("refuses oversized bodies, invalid JSON and missing contact – nothing stored", async () => {
    expect((await saveDraft(post(null, JSON.stringify({ ...draftBody, pad: "x".repeat(20_000) })))).status).toBe(413);
    expect((await saveDraft(post(null, "{nope"))).status).toBe(400);
    expect((await saveDraft(post({ ...draftBody, contact: { firstName: "A", lastName: "B", email: "", phone: "" } }))).status).toBe(400);
    expect((await saveDraft(post({ ...draftBody, website: "spam" }))).status).toBe(200);
    expect(db.drafts).toHaveLength(0);
  });

  it("is rate-limited", async () => {
    const req = () => new Request("http://localhost/api/x", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.8.8.8" }, body: JSON.stringify({ ...draftBody, website: "x" }) });
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) statuses.push((await saveDraft(req())).status);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe("drafts disappear when an order is created from them", () => {
  it("POST /api/orders with draftId deletes the snapshot", async () => {
    await saveDraft(post(draftBody));
    expect(db.drafts).toHaveLength(1);
    const res = await createOrder(post({
      items: [{ productId: amour.id, sizeId: "m", quantity: 2, extras: [] }],
      recipient, delivery: { date: day.date, windowId: day.windows[0].id },
      customer: { ...contact, acceptedTerms: true, newsletter: false }, payment: { method: "card" }, draftId: ID,
    }));
    expect(res.status).toBe(201);
    await vi.waitFor(() => expect(db.drafts).toHaveLength(0));
  });

  it("a failed order keeps the snapshot", async () => {
    await saveDraft(post(draftBody));
    const res = await createOrder(post({ items: [], draftId: ID }));
    expect(res.status).toBe(400);
    expect(db.drafts).toHaveLength(1);
  });

  it("POST /api/express/order with draftId deletes the express entry", async () => {
    await saveDraft(post({ id: ID, source: "express", items, delivery: { date: day.date, windowId: day.windows[0].id }, express: { wallet: "google_pay", postalCode: "1040" } }));
    expect(db.drafts[0]).toMatchObject({ source: "express", totalComplete: true });
    const wallet = {
      expressPaymentType: "google_pay",
      billingDetails: { name: "Paul Maier", email: "paul.maier@example.com", phone: "+43 664 7654321" },
      shippingAddress: { name: "Anna Huber", address: { line1: "Wiedner Hauptstraße 12", city: "Wien", postal_code: "1040", country: "AT" } },
    };
    const res = await expressOrder(post({ items, delivery: { date: day.date, windowId: day.windows[0].id }, wallet, acceptedTerms: true, draftId: ID }));
    expect(res.status).toBe(201);
    await vi.waitFor(() => expect(db.drafts).toHaveLength(0));
  });
});

describe("retention", () => {
  const draft = (id: string, updatedAt: string): CheckoutDraft => ({ id, source: "checkout", createdAt: updatedAt, updatedAt, lines: [] });

  it("drops drafts older than 30 days and caps the list, newest first", () => {
    const now = Date.parse("2026-11-20T12:00:00.000Z");
    const fresh = draft("a".repeat(16), new Date(now - DRAFT_TTL_MS + 60_000).toISOString());
    const old = draft("b".repeat(16), new Date(now - DRAFT_TTL_MS - 60_000).toISOString());
    expect(pruneDrafts([old, fresh], now).map((d) => d.id)).toEqual([fresh.id]);
    const many = Array.from({ length: MAX_DRAFTS + 5 }, (_, i) => draft(`c${String(i).padStart(15, "0")}`, new Date(now - i * 1000).toISOString()));
    const kept = pruneDrafts(many, now);
    expect(kept).toHaveLength(MAX_DRAFTS);
    expect(kept[0].id).toBe(many[0].id);
  });

  it("listing and the cron prune the stored list; delete removes one entry", async () => {
    const now = Date.now();
    db.drafts = [draft("e".repeat(16), new Date(now - 1000).toISOString()), draft("f".repeat(16), new Date(now - DRAFT_TTL_MS - 1000).toISOString())];
    expect((await listCheckoutDrafts(now)).map((d) => d.id)).toEqual(["e".repeat(16)]);
    await vi.waitFor(() => expect(db.drafts).toHaveLength(1));
    db.drafts.push(draft("g".repeat(16), new Date(now - DRAFT_TTL_MS - 5000).toISOString()));
    expect(await pruneCheckoutDrafts(now)).toBe(1);
    expect(await deleteCheckoutDraft("e".repeat(16))).toBe(true);
    expect(await deleteCheckoutDraft("e".repeat(16))).toBe(false);
    expect(await deleteCheckoutDraft("../x")).toBe(false);
    expect(db.drafts).toHaveLength(0);
  });
});
