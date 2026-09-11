import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import type { CartItem, Coupon, DeliveryZone, Extra, Order, OrderLine, OrderStatus, Product, SizeId } from "@/types";
import type { CreatePaymentResult, PaymentProviderId } from "@/types/payments";
import { addOrder, getAllProducts, getCoupons, getDeliveryZones, getExtras, getOrderById, getOrders, getSettings, readCollection, updateOrder, writeCollection } from "@/lib/cms";
import { findZone, getAvailableDays, getLocalNow, normalizePostalCode } from "@/lib/delivery";
import { computeTotals, validateCoupon } from "@/lib/pricing";
import { createPayment, providerForMethod, type PaymentEvent } from "@/lib/payments";
import { sendOrderConfirmation } from "@/lib/mail";
import {
  cleanString, isIsoDate, LIMITS, validateCustomerFields, validateDeliveryFields, validateGreetingFields, validateRecipientFields,
  type FieldErrors, type OrderPayload, type OrderPayloadItem,
} from "@/lib/order-payload";

/* ---------------- Status flow (shared with admin) ---------------- */

/** The happy path, in order. Negative terminal states live outside the flow. */
export const ORDER_STATUS_FLOW: OrderStatus[] = ["received", "paid", "preparing", "arranging", "ready", "in_transit", "delivered"];
export const NEGATIVE_STATUSES: OrderStatus[] = ["undeliverable", "cancelled"];

/** Which statuses an admin may move an order to from the given status. */
export function nextStatuses(status: OrderStatus): OrderStatus[] {
  if (status === "delivered" || status === "cancelled") return [];
  if (status === "undeliverable") return ["in_transit", "delivered", "cancelled"];
  const idx = ORDER_STATUS_FLOW.indexOf(status);
  const next = idx >= 0 && idx < ORDER_STATUS_FLOW.length - 1 ? [ORDER_STATUS_FLOW[idx + 1]] : [];
  if (status === "in_transit") return [...next, "undeliverable", "cancelled"];
  return [...next, "cancelled"];
}

export function isNegativeStatus(status: OrderStatus) {
  return NEGATIVE_STATUSES.includes(status);
}

/* ---------------- Public view ---------------- */

export type PublicOrder = Omit<Order, "internalNote" | "token">;

/** Strips fields that must never leave the server (the token is only ever sent once, on creation). */
export function publicOrderView(order: Order): PublicOrder {
  const { internalNote: _internalNote, token: _token, ...rest } = order;
  void _internalNote; void _token;
  return rest;
}

/* ---------------- Payload parsing ---------------- */

export type ParseResult = { ok: true; payload: OrderPayload } | { ok: false; status: number; message: string; errors?: FieldErrors };

const PAYMENT_METHODS = new Set(["apple_pay", "google_pay", "card", "paypal", "klarna", "eps"]);
const SIZE_IDS = new Set<SizeId>(["s", "m", "l"]);

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function asInt(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

/** Hand-written structural validation of an unknown JSON body – no schema library. */
export function parseOrderPayload(input: unknown, opts: { greetingMaxChars: number }): ParseResult {
  const body = asRecord(input);
  if (!body) return { ok: false, status: 400, message: "Ungültige Anfrage." };

  // items
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 20) {
    return { ok: false, status: 400, message: "Dein Warenkorb ist leer.", errors: { items: "Dein Warenkorb ist leer." } };
  }
  const items: OrderPayloadItem[] = [];
  for (const raw of body.items) {
    const it = asRecord(raw);
    if (!it) return { ok: false, status: 400, message: "Ungültiger Artikel im Warenkorb." };
    const productId = cleanString(it.productId, 60);
    const sizeId = cleanString(it.sizeId, 2) as SizeId | undefined;
    const quantity = asInt(it.quantity, 1, 20);
    if (!productId || !sizeId || !SIZE_IDS.has(sizeId) || quantity === null) {
      return { ok: false, status: 400, message: "Ungültiger Artikel im Warenkorb." };
    }
    const extras: OrderPayloadItem["extras"] = [];
    if (it.extras !== undefined) {
      if (!Array.isArray(it.extras) || it.extras.length > 20) return { ok: false, status: 400, message: "Ungültige Extras." };
      for (const rawExtra of it.extras) {
        const ex = asRecord(rawExtra);
        const extraId = ex ? cleanString(ex.extraId, 60) : undefined;
        const q = ex ? asInt(ex.quantity, 1, 20) : null;
        if (!extraId || q === null) return { ok: false, status: 400, message: "Ungültige Extras." };
        extras.push({ extraId, quantity: q });
      }
    }
    const greeting = {
      message: typeof it.message === "string" ? it.message.replace(/\r\n/g, "\n").trim() : undefined,
      anonymous: it.anonymous === true,
      senderName: cleanString(it.senderName, LIMITS.name + 1),
    };
    const gErr = validateGreetingFields(greeting, opts.greetingMaxChars);
    if (Object.keys(gErr).length) return { ok: false, status: 400, message: "Bitte prüfe die Grußkarte.", errors: gErr };
    items.push({
      productId, sizeId, quantity, extras,
      message: greeting.message || undefined,
      anonymous: greeting.anonymous,
      senderName: greeting.anonymous ? undefined : greeting.senderName,
    });
  }

  // recipient
  const r = asRecord(body.recipient);
  if (!r) return { ok: false, status: 400, message: "Bitte gib die Empfängeradresse an." };
  const recipient = {
    firstName: cleanString(r.firstName, LIMITS.name + 1) ?? "",
    lastName: cleanString(r.lastName, LIMITS.name + 1) ?? "",
    company: cleanString(r.company, LIMITS.company + 1),
    street: cleanString(r.street, LIMITS.street + 1) ?? "",
    houseNumber: cleanString(r.houseNumber, LIMITS.houseNumber + 1) ?? "",
    addition: cleanString(r.addition, LIMITS.addition + 1),
    zip: normalizePostalCode(cleanString(r.zip, 10) ?? ""),
    city: cleanString(r.city, LIMITS.name + 1) ?? "",
    phone: cleanString(r.phone, LIMITS.phone + 1) ?? "",
  };
  const rErr = validateRecipientFields(recipient);
  if (Object.keys(rErr).length) return { ok: false, status: 400, message: "Bitte prüfe die Empfängeradresse.", errors: prefix("recipient", rErr) };

  // delivery
  const d = asRecord(body.delivery);
  const delivery = {
    date: cleanString(d?.date, 10) ?? "",
    windowId: cleanString(d?.windowId, 40),
    note: cleanString(d?.note, LIMITS.note + 1),
  };
  const dErr = validateDeliveryFields(delivery);
  if (Object.keys(dErr).length || !isIsoDate(delivery.date)) {
    return { ok: false, status: 400, message: "Bitte prüfe die Lieferangaben.", errors: prefix("delivery", { date: "Bitte wähle ein Lieferdatum.", ...dErr }) };
  }

  // customer
  const c = asRecord(body.customer);
  const customer = {
    firstName: cleanString(c?.firstName, LIMITS.name + 1) ?? "",
    lastName: cleanString(c?.lastName, LIMITS.name + 1) ?? "",
    email: (cleanString(c?.email, LIMITS.email + 1) ?? "").toLowerCase(),
    phone: cleanString(c?.phone, LIMITS.phone + 1) ?? "",
    acceptedTerms: c?.acceptedTerms === true,
    newsletter: c?.newsletter === true,
  };
  const cErr = validateCustomerFields(customer);
  if (Object.keys(cErr).length) return { ok: false, status: 400, message: "Bitte prüfe deine Kontaktdaten.", errors: prefix("customer", cErr) };

  // payment
  const p = asRecord(body.payment);
  const method = cleanString(p?.method, 20);
  if (!method || !PAYMENT_METHODS.has(method)) {
    return { ok: false, status: 400, message: "Bitte wähle eine Zahlungsart.", errors: { "payment.method": "Bitte wähle eine Zahlungsart." } };
  }

  const couponCode = cleanString(body.couponCode, 40)?.toUpperCase();

  return {
    ok: true,
    payload: { items, recipient, delivery, customer, payment: { method: method as OrderPayload["payment"]["method"] }, couponCode },
  };
}

function prefix(scope: string, errors: FieldErrors): FieldErrors {
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => [`${scope}.${k}`, v]));
}

/* ---------------- Resolution against the catalog ---------------- */

export type CreateOrderResult =
  | { ok: true; order: Order }
  | { ok: false; status: number; message: string; errors?: FieldErrors };

interface ResolvedLine {
  line: OrderLine;
  product: Product;
  cartItem: CartItem; // for computeTotals
}

function resolveLines(items: OrderPayloadItem[], products: Product[], extras: Extra[]): { ok: true; lines: ResolvedLine[] } | { ok: false; message: string } {
  const lines: ResolvedLine[] = [];
  for (const it of items) {
    const product = products.find((p) => p.id === it.productId && p.active);
    if (!product) return { ok: false, message: "Ein Artikel in deinem Warenkorb ist nicht mehr verfügbar. Bitte prüfe den Warenkorb." };
    if (!product.deliverable) return { ok: false, message: `„${product.name}" kann derzeit nicht geliefert werden.` };
    const size = product.sizes.find((s) => s.id === it.sizeId);
    if (!size) return { ok: false, message: `Die gewählte Größe von „${product.name}" ist nicht verfügbar.` };
    if ((product.stock !== null && product.stock < it.quantity) || (size.stock !== undefined && size.stock < it.quantity)) {
      return { ok: false, message: `„${product.name}" ist in dieser Menge leider nicht mehr verfügbar.` };
    }
    const lineExtras: OrderLine["extras"] = [];
    for (const ex of it.extras) {
      const extra = extras.find((e) => e.id === ex.extraId && e.active);
      if (!extra) return { ok: false, message: "Ein Extra in deinem Warenkorb ist nicht mehr verfügbar." };
      lineExtras.push({ extraId: extra.id, name: extra.name, quantity: ex.quantity, unitPrice: extra.price });
    }
    const image = (product.images.find((i) => i.kind === "front") ?? product.images[0])?.src ?? "";
    lines.push({
      product,
      line: {
        productId: product.id, productName: product.name, sizeId: size.id, sizeLabel: size.label,
        quantity: it.quantity, unitPrice: size.price, image, extras: lineExtras,
        message: it.message, anonymous: it.anonymous, senderName: it.senderName,
      },
      cartItem: {
        id: `${product.id}-${size.id}`, productId: product.id, sizeId: size.id, quantity: it.quantity,
        extras: lineExtras.map((e) => ({ extraId: e.extraId, quantity: e.quantity, name: e.name, price: e.unitPrice, image: "" })),
        snapshot: { slug: product.slug, name: product.name, tagline: product.tagline, image, sizeLabel: size.label, unitPrice: size.price, sameDayCapable: product.sameDayCapable },
      },
    });
  }
  return { ok: true, lines };
}

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // uppercase alphanumerics without ambiguous glyphs

async function generateOrderId() {
  for (let attempt = 0; attempt < 10; attempt++) {
    let s = "";
    for (let i = 0; i < 6; i++) s += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
    const id = `BQ-${s}`;
    if (!(await getOrderById(id))) return id;
  }
  throw new Error("Could not generate a unique order id");
}

/* ---------------- Stock ---------------- */

type StockLine = Pick<OrderLine, "productId" | "sizeId" | "quantity">;

/**
 * Stock writes are serialised through one promise chain so two concurrent orders
 * cannot both pass the availability check with the same units (single process).
 */
let stockQueue: Promise<unknown> = Promise.resolve();
function withStockLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = stockQueue.then(fn, fn);
  stockQueue = run.catch(() => undefined);
  return run;
}

function applyStockDelta(products: Product[], lines: StockLine[], sign: 1 | -1, check: boolean): { ok: true; changed: boolean } | { ok: false; message: string } {
  let changed = false;
  for (const line of lines) {
    const product = products.find((p) => p.id === line.productId);
    if (!product) continue;
    const size = product.sizes.find((s) => s.id === line.sizeId);
    const delta = sign * line.quantity;
    if (check && ((product.stock !== null && product.stock + delta < 0) || (size && typeof size.stock === "number" && size.stock + delta < 0))) {
      return { ok: false, message: `„${product.name}" ist in dieser Menge leider nicht mehr verfügbar.` };
    }
    if (product.stock !== null && typeof product.stock === "number") { product.stock = Math.max(0, product.stock + delta); changed = true; }
    if (size && typeof size.stock === "number") { size.stock = Math.max(0, size.stock + delta); changed = true; }
  }
  return { ok: true, changed };
}

/** Decrements product/size stock (only where tracked). Fails without writing when a line is no longer available. */
export function reserveStock(lines: StockLine[]): Promise<{ ok: true } | { ok: false; message: string }> {
  return withStockLock(async () => {
    const products = structuredClone(await readCollection<Product[]>("products"));
    const res = applyStockDelta(products, lines, -1, true);
    if (!res.ok) return res;
    if (res.changed) await writeCollection("products", products);
    return { ok: true };
  });
}

/** Gives reserved units back (failed / cancelled payment). Never throws – logs instead. */
export function releaseStock(lines: StockLine[]): Promise<void> {
  return withStockLock(async () => {
    try {
      const products = structuredClone(await readCollection<Product[]>("products"));
      const res = applyStockDelta(products, lines, 1, false);
      if (res.ok && res.changed) await writeCollection("products", products);
    } catch (err) {
      console.error("[orders] releasing stock failed", err);
    }
  });
}

/* ---------------- Creation ---------------- */

export type CreateOrderOutcome =
  | { ok: true; order: Order; payment: CreatePaymentResult }
  | { ok: false; status: number; message: string; errors?: FieldErrors };

/**
 * Builds and persists an order from an already parsed payload.
 * Everything price-relevant is re-resolved from the catalog; the client's
 * snapshots are ignored.
 *
 * Sequence: validate → reserve stock → store the order as `received`/payment
 * `pending` → create the provider payment. Mock pays immediately; Stripe and
 * PayPal return what the browser needs to finish the payment (client secret /
 * approve URL) and the order is marked paid by confirm endpoint or webhook.
 */
export async function createOrderFromPayload(payload: OrderPayload, opts: { siteUrl: string }): Promise<CreateOrderOutcome> {
  const [products, extras, zones, coupons, settings] = await Promise.all([
    getAllProducts(), getExtras(), getDeliveryZones(), getCoupons(), getSettings(),
  ]);

  const paymentConfig = settings.payments.find((p) => p.id === payload.payment.method && p.enabled);
  const provider = paymentConfig ? providerForMethod(paymentConfig.id) : null;
  if (!paymentConfig || !provider) {
    return { ok: false, status: 400, message: "Diese Zahlungsart ist derzeit nicht verfügbar.", errors: { "payment.method": "Bitte wähle eine andere Zahlungsart." } };
  }

  const resolved = resolveLines(payload.items, products, extras);
  if (!resolved.ok) return { ok: false, status: 409, message: resolved.message, errors: { items: resolved.message } };
  const lines = resolved.lines;

  // Zone & delivery day
  const zone: DeliveryZone | null = findZone(payload.recipient.zip, zones);
  if (!zone) {
    return { ok: false, status: 400, message: "In dieses Gebiet liefern wir derzeit leider noch nicht.", errors: { "recipient.zip": "In dieses Gebiet liefern wir derzeit leider noch nicht." } };
  }
  const now = getLocalNow(settings.timezone);
  const days = getAvailableDays({
    zone, settings, now,
    product: { sameDayCapable: lines.every((l) => l.product.sameDayCapable), deliverable: lines.every((l) => l.product.deliverable) },
  });
  const day = days.find((d) => d.date === payload.delivery.date);
  if (!day) {
    return { ok: false, status: 400, message: "Das gewählte Lieferdatum ist nicht mehr verfügbar. Bitte wähle ein anderes Datum.", errors: { "delivery.date": "Dieses Datum ist nicht mehr verfügbar." } };
  }
  let windowLabel: string | undefined;
  if (payload.delivery.windowId) {
    const win = day.windows.find((w) => w.id === payload.delivery.windowId);
    if (!win) return { ok: false, status: 400, message: "Das gewählte Zeitfenster ist an diesem Tag nicht verfügbar.", errors: { "delivery.windowId": "Bitte wähle ein anderes Zeitfenster." } };
    windowLabel = win.label;
  }

  // Coupon
  let coupon: Coupon | null = null;
  const cartItems = lines.map((l) => l.cartItem);
  if (payload.couponCode) {
    coupon = coupons.find((c) => c.code.toUpperCase() === payload.couponCode) ?? null;
    const subtotal = cartItems.reduce((s, i) => s + i.snapshot.unitPrice * i.quantity + i.extras.reduce((x, e) => x + e.price * e.quantity, 0), 0);
    const v = validateCoupon(coupon, subtotal, now.date);
    if (!v.ok) return { ok: false, status: 400, message: v.error ?? "Dieser Gutschein ist nicht gültig.", errors: { couponCode: v.error ?? "Ungültiger Code." } };
  }

  const totals = computeTotals({ items: cartItems, zone, windowId: payload.delivery.windowId, coupon, today: now.date });
  if (totals.belowMinOrder) {
    return { ok: false, status: 400, message: `Für dieses Liefergebiet gilt ein Mindestbestellwert von ${totals.minOrder.toFixed(2).replace(".", ",")} €.` };
  }

  // Reserve stock before anything is persisted – the check inside the lock is authoritative.
  const orderLines = lines.map((l) => l.line);
  const reserved = await reserveStock(orderLines);
  if (!reserved.ok) return { ok: false, status: 409, message: reserved.message, errors: { items: reserved.message } };

  // Build & store the order (payment pending)
  const id = await generateOrderId();
  const token = randomBytes(12).toString("hex"); // 24 hex chars
  const createdAt = new Date().toISOString();
  const order: Order = {
    id, token, createdAt, status: "received", history: [{ status: "received", at: createdAt }],
    recipient: { ...payload.recipient, country: "AT" },
    delivery: {
      date: payload.delivery.date, windowId: payload.delivery.windowId, windowLabel, note: payload.delivery.note,
      zoneId: zone.id, zoneName: zone.name, fee: totals.delivery,
    },
    customer: { firstName: payload.customer.firstName, lastName: payload.customer.lastName, email: payload.customer.email, phone: payload.customer.phone },
    lines: orderLines,
    coupon: coupon && totals.discount > 0 ? { code: coupon.code, discount: totals.discount } : coupon?.type === "free_shipping" ? { code: coupon.code, discount: 0 } : undefined,
    totals: { subtotal: totals.itemsSubtotal, extras: totals.extrasSubtotal, delivery: totals.delivery, discount: totals.discount, total: totals.total },
    payment: { method: paymentConfig.id, status: "pending", provider },
  };

  try {
    await addOrder(order);
  } catch (err) {
    await releaseStock(orderLines);
    throw err;
  }

  // Provider step
  let payment: CreatePaymentResult;
  try {
    payment = await createPayment({ order, siteUrl: opts.siteUrl });
  } catch (err) {
    console.error(`[payments] ${provider} createPayment failed for ${id}`, err);
    payment = { status: "failed", provider, message: "Die Zahlung konnte nicht gestartet werden. Bitte versuch es noch einmal oder wähle eine andere Zahlungsart." };
  }

  if (payment.status === "failed") {
    await markOrderPaymentFailed(id, { note: payment.message ?? "Zahlung konnte nicht gestartet werden", intentId: payment.intentId });
    return { ok: false, status: 402, message: payment.message ?? "Die Zahlung konnte nicht durchgeführt werden. Bitte versuch es erneut." };
  }

  let stored: Order | null;
  if (payment.status === "paid") {
    stored = await markOrderPaid(id, {
      provider: payment.provider, reference: payment.reference, intentId: payment.intentId,
      note: payment.provider === "mock" ? "Testzahlung (mock)" : payment.reference,
    });
  } else {
    stored = await updateOrder(id, (o) => ({ ...o, payment: { ...o.payment, provider: payment.provider, intentId: payment.intentId ?? o.payment.intentId, reference: payment.reference ?? o.payment.reference } }));
  }

  return { ok: true, order: stored ?? order, payment };
}

/* ---------------- Payment transitions (idempotent) ---------------- */

export interface PaidInfo {
  provider?: PaymentProviderId | string;
  reference?: string;
  intentId?: string;
  note?: string;
}

/**
 * Marks an order as paid. Safe to call repeatedly (confirm endpoint + webhook):
 * an already paid order is returned unchanged – no duplicate history entry, no
 * second confirmation mail. Advances `status` to `paid` only from `received`
 * so an order the staff already moved on is not pulled back.
 */
export async function markOrderPaid(id: string, info: PaidInfo): Promise<Order | null> {
  const before = await getOrderById(id);
  if (!before) return null;
  if (before.payment.status === "paid") return before;
  const wasReleased = before.payment.status === "failed";

  const at = new Date().toISOString();
  const updated = await updateOrder(id, (o) => {
    if (o.payment.status === "paid") return o;
    const alreadyLogged = o.history.some((h) => h.status === "paid");
    return {
      ...o,
      status: o.status === "received" || isNegativeStatus(o.status) ? "paid" : o.status,
      history: alreadyLogged ? o.history : [...o.history, { status: "paid", at, ...(info.note ? { note: info.note } : {}) }],
      payment: {
        ...o.payment,
        status: "paid",
        paidAt: at,
        provider: info.provider ?? o.payment.provider,
        reference: info.reference ?? o.payment.reference,
        intentId: info.intentId ?? o.payment.intentId,
      },
    };
  });
  if (!updated) return null;

  // A payment that arrives after we already gave the units back (late webhook) re-reserves them.
  if (wasReleased) await reserveStock(updated.lines).catch((err) => console.error("[orders] re-reserving stock failed", err));

  // Fire-and-forget: a failing mail stub must never fail the payment.
  sendOrderConfirmation(updated).catch((err) => console.error("[mail] confirmation failed", err));
  return updated;
}

/** Marks the payment as failed/cancelled and releases the reserved stock (once). Paid orders are never touched. */
export async function markOrderPaymentFailed(id: string, info: { note?: string; intentId?: string }): Promise<Order | null> {
  const before = await getOrderById(id);
  if (!before) return null;
  if (before.payment.status !== "pending") return before;

  const updated = await updateOrder(id, (o) => {
    if (o.payment.status !== "pending") return o;
    return {
      ...o,
      history: [...o.history, { status: o.status, at: new Date().toISOString(), note: info.note ?? "Zahlung fehlgeschlagen" }],
      payment: { ...o.payment, status: "failed", intentId: info.intentId ?? o.payment.intentId },
    };
  });
  if (updated && updated.payment.status === "failed") await releaseStock(updated.lines);
  return updated;
}

/** Records a (full or partial) refund reported by the provider. The order status is left to the staff. */
export async function markOrderRefunded(id: string, info: { note?: string; reference?: string }): Promise<Order | null> {
  return updateOrder(id, (o) => {
    if (o.payment.status === "refunded") return o;
    return {
      ...o,
      history: [...o.history, { status: o.status, at: new Date().toISOString(), note: info.note ?? "Zahlung erstattet" }],
      payment: { ...o.payment, status: "refunded", reference: info.reference ?? o.payment.reference },
    };
  });
}

/** Finds the order a provider event belongs to – by our id (metadata) or by the provider-side id. */
export async function findOrderForPaymentEvent(event: Pick<PaymentEvent, "orderId" | "intentId">): Promise<Order | null> {
  if (event.orderId) {
    const byId = await getOrderById(event.orderId);
    if (byId) return byId;
  }
  if (event.intentId) {
    return (await getOrders()).find((o) => o.payment.intentId === event.intentId) ?? null;
  }
  return null;
}

/** Applies a normalised webhook event. Returns what happened for logging. */
export async function applyPaymentEvent(event: PaymentEvent): Promise<{ orderId: string | null; applied: boolean }> {
  const order = await findOrderForPaymentEvent(event);
  if (!order) return { orderId: null, applied: false };
  switch (event.kind) {
    case "paid":
      await markOrderPaid(order.id, { reference: event.reference, intentId: event.intentId, note: event.note });
      return { orderId: order.id, applied: true };
    case "failed":
      await markOrderPaymentFailed(order.id, { note: event.note, intentId: event.intentId });
      return { orderId: order.id, applied: true };
    case "refunded":
      await markOrderRefunded(order.id, { note: event.note, reference: event.reference });
      return { orderId: order.id, applied: true };
  }
}
