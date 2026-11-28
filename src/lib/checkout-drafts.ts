import "server-only";
import type { CheckoutDraft, Extra, Product } from "@/types";
import { getAllProducts, getCheckoutDrafts, getExtras, saveCheckoutDrafts } from "@/lib/cms";
import { cleanString, isEmail, isIsoDate, isPhone, LIMITS, type OrderPayloadItem } from "@/lib/order-payload";
import { parseOrderItems, priceOrder } from "@/lib/orders";
import { isValidAustrianPostalCode, normalizePostalCode } from "@/lib/delivery";
import { isLocale } from "@/i18n/config";

/**
 * "Abgebrochene Kasse" – checkouts that did not (yet) become an order.
 *
 * The browser posts a snapshot when the customer reaches the payment step (contact data
 * known) and when an Express-Kauf wallet sheet is closed without paying. Stored through
 * the cms store layer (`data/checkout-drafts.json` or Postgres), upserted by a random id
 * the browser keeps in sessionStorage, deleted when an order is created with that id
 * (`draftId` of POST /api/orders and /api/express/order) and after 30 days.
 * Names and prices come from the catalog, never from the browser.
 */

export const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Hard cap of stored drafts – the oldest go first (protects the store from floods). */
export const MAX_DRAFTS = 1000;
/** Largest accepted request body (bytes). */
export const MAX_DRAFT_BODY = 16_000;

export function isDraftId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(v);
}

export interface DraftInput {
  id: string;
  source: CheckoutDraft["source"];
  step?: number;
  locale?: string;
  items: OrderPayloadItem[];
  couponCode?: string;
  contact?: CheckoutDraft["contact"];
  recipient?: CheckoutDraft["recipient"];
  delivery?: { date: string; windowId?: string };
  express?: CheckoutDraft["express"];
}

export type DraftParseResult = { ok: true; input: DraftInput } | { ok: true; ignored: true } | { ok: false; status: number; message: string };

const rec = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const s = (v: unknown, max: number) => cleanString(typeof v === "string" ? v.replace(/[\r\n\t]+/g, " ") : v, max) ?? "";

/**
 * Structural validation of an untrusted draft body. Checkout drafts are only kept with a
 * valid e-mail address OR phone number (otherwise there is nobody to contact); express
 * drafts usually carry no contact data (the wallet releases it only on payment – it is
 * kept when the payment was authorised but the order could not be created). A filled
 * honeypot field (`website`) is answered with "ok" but never stored.
 */
export function parseDraftInput(body: unknown): DraftParseResult {
  const b = rec(body);
  if (!b) return { ok: false, status: 400, message: "invalid" };
  if (typeof b.website === "string" && b.website.trim()) return { ok: true, ignored: true };
  if (!isDraftId(b.id)) return { ok: false, status: 400, message: "id" };
  const source = b.source === "express" ? "express" : b.source === "checkout" ? "checkout" : null;
  if (!source) return { ok: false, status: 400, message: "source" };

  // Greeting texts are not needed for a follow-up call – drop them before parsing.
  const rawItems = Array.isArray(b.items) ? b.items.map((i) => { const r = rec(i); return r ? { ...r, message: undefined, senderName: undefined, anonymous: undefined } : i; }) : b.items;
  const items = parseOrderItems(rawItems, { greetingMaxChars: 0 });
  if (!items.ok) return { ok: false, status: 400, message: "items" };

  const c = rec(b.contact);
  const contact = c ? { firstName: s(c.firstName, LIMITS.name), lastName: s(c.lastName, LIMITS.name), email: s(c.email, LIMITS.email), phone: s(c.phone, LIMITS.phone) } : undefined;
  const contactValid = Boolean(contact && (isEmail(contact.email) || isPhone(contact.phone)));
  if (source === "checkout" && !contactValid) return { ok: false, status: 400, message: "contact" };
  if (contact) {
    if (contact.email && !isEmail(contact.email)) contact.email = "";
    if (contact.phone && !isPhone(contact.phone)) contact.phone = "";
  }

  const r = rec(b.recipient);
  const recipient = r ? {
    firstName: s(r.firstName, LIMITS.name), lastName: s(r.lastName, LIMITS.name),
    ...(s(r.company, LIMITS.company) ? { company: s(r.company, LIMITS.company) } : {}),
    street: s(r.street, LIMITS.street), houseNumber: s(r.houseNumber, LIMITS.houseNumber),
    ...(s(r.addition, LIMITS.addition) ? { addition: s(r.addition, LIMITS.addition) } : {}),
    zip: normalizePostalCode(s(r.zip, 10)), city: s(r.city, 80), phone: s(r.phone, LIMITS.phone),
  } : undefined;

  const d = rec(b.delivery);
  const date = d ? s(d.date, 10) : "";
  const delivery = date && isIsoDate(date) ? { date, ...(s(d?.windowId, 40) ? { windowId: s(d?.windowId, 40) } : {}) } : undefined;

  const e = rec(b.express);
  const express = source === "express" && e ? {
    ...(s(e.wallet, 20) ? { wallet: s(e.wallet, 20) } : {}),
    ...(s(e.postalCode, 10) ? { postalCode: normalizePostalCode(s(e.postalCode, 10)) } : {}),
    ...(s(e.city, 80) ? { city: s(e.city, 80) } : {}),
    ...(s(e.country, 4) ? { country: s(e.country, 4).toUpperCase() } : {}),
  } : undefined;

  const step = typeof b.step === "number" && Number.isInteger(b.step) && b.step >= 1 && b.step <= 5 ? b.step : undefined;
  const locale = isLocale(b.locale) ? b.locale : undefined;
  const couponCode = s(b.couponCode, 40) || undefined;

  return {
    ok: true,
    input: {
      id: b.id, source, items: items.items,
      ...(step ? { step } : {}), ...(locale ? { locale } : {}), ...(couponCode ? { couponCode } : {}),
      // Express: only when the wallet released it (payment authorised, but the order could not be created).
      ...(contact && contactValid ? { contact } : {}),
      ...(recipient ? { recipient } : {}), ...(delivery ? { delivery } : {}), ...(express ? { express } : {}),
    },
  };
}

/** Cart lines with catalog names and prices – unknown products are kept by id. */
export function describeLines(items: OrderPayloadItem[], products: Product[], extras: Extra[]): { lines: CheckoutDraft["lines"]; goods: number } {
  let goods = 0;
  const lines = items.map((it) => {
    const product = products.find((p) => p.id === it.productId);
    const size = product?.sizes.find((x) => x.id === it.sizeId);
    const color = product?.colorOptions?.find((c) => c.id === it.colorId)?.label;
    const lineExtras = it.extras.map((ex) => {
      const extra = extras.find((x) => x.id === ex.extraId);
      if (extra) goods += extra.price * ex.quantity * it.quantity;
      return { name: extra?.name ?? ex.extraId, quantity: ex.quantity };
    });
    if (size) goods += size.price * it.quantity;
    return {
      productId: it.productId, name: product?.name ?? it.productId, quantity: it.quantity,
      ...(size ? { sizeLabel: size.label, unitPrice: size.price } : {}),
      ...(color ? { color } : {}),
      ...(lineExtras.length ? { extras: lineExtras } : {}),
    };
  });
  return { lines, goods: Math.round(goods * 100) / 100 };
}

/** Drops drafts older than 30 days (by last update) and keeps at most MAX_DRAFTS, newest first. */
export function pruneDrafts(list: CheckoutDraft[], now = Date.now()): CheckoutDraft[] {
  return list
    .filter((d) => now - Date.parse(d.updatedAt || d.createdAt) < DRAFT_TTL_MS)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_DRAFTS);
}

/* ---------------- Persistence (serialised per process, like the stock lock) ---------------- */

let chain: Promise<unknown> = Promise.resolve();
function withDraftLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

/** Creates or updates the draft with `input.id`. */
export async function upsertCheckoutDraft(input: DraftInput, now = new Date()): Promise<CheckoutDraft> {
  const [products, extras] = await Promise.all([getAllProducts(true), getExtras(false)]);
  const { lines, goods } = describeLines(input.items, products, extras);
  const zip = input.recipient?.zip || input.express?.postalCode || "";
  let total = goods;
  let complete = false;
  let windowLabel: string | undefined;
  if (input.delivery?.date && isValidAustrianPostalCode(zip)) {
    const priced = await priceOrder({ items: input.items, zip, date: input.delivery.date, windowId: input.delivery.windowId, couponCode: input.couponCode }).catch(() => null);
    if (priced?.ok) {
      total = priced.totals.total;
      complete = true;
      windowLabel = priced.window?.label;
    }
  }
  const at = now.toISOString();
  return withDraftLock(async () => {
    const list = await getCheckoutDrafts();
    const existing = list.find((d) => d.id === input.id);
    const draft: CheckoutDraft = {
      id: input.id,
      source: input.source,
      createdAt: existing?.createdAt ?? at,
      updatedAt: at,
      ...(input.step ? { step: input.step } : {}),
      ...(input.locale ? { locale: input.locale } : {}),
      ...(input.contact ? { contact: input.contact } : {}),
      ...(input.recipient ? { recipient: input.recipient } : {}),
      ...(input.delivery ? { delivery: { ...input.delivery, ...(windowLabel ? { windowLabel } : {}) } } : {}),
      lines,
      ...(input.couponCode ? { couponCode: input.couponCode } : {}),
      totalEstimate: total,
      totalComplete: complete,
      ...(input.express ? { express: input.express } : {}),
    };
    await saveCheckoutDrafts(pruneDrafts([draft, ...list.filter((d) => d.id !== input.id)], now.getTime()));
    return draft;
  });
}

/** Removes one draft (order created from it, or deleted in the admin). True when it existed. */
export async function deleteCheckoutDraft(id: string): Promise<boolean> {
  if (!isDraftId(id)) return false;
  return withDraftLock(async () => {
    const list = await getCheckoutDrafts();
    const next = list.filter((d) => d.id !== id);
    if (next.length === list.length) return false;
    await saveCheckoutDrafts(next);
    return true;
  });
}

/** All drafts, newest first; drafts older than 30 days are deleted on the way. */
export async function listCheckoutDrafts(now = Date.now()): Promise<CheckoutDraft[]> {
  const list = await getCheckoutDrafts();
  const kept = pruneDrafts(list, now);
  if (kept.length !== list.length) {
    await withDraftLock(async () => saveCheckoutDrafts(pruneDrafts(await getCheckoutDrafts(), now))).catch((err: unknown) => console.error("[drafts] pruning failed", err));
  }
  return kept;
}

/** Deletes drafts older than 30 days. Returns how many were removed. */
export async function pruneCheckoutDrafts(now = Date.now()): Promise<number> {
  return withDraftLock(async () => {
    const list = await getCheckoutDrafts();
    const kept = pruneDrafts(list, now);
    if (kept.length !== list.length) await saveCheckoutDrafts(kept);
    return list.length - kept.length;
  });
}
