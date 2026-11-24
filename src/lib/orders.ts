import { trackPurchase, trackRefund } from "@/lib/analytics-server";
import "server-only";
import { after } from "next/server";
import { bookCourierSafely } from "@/lib/courier";
import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { CartItem, Coupon, DeliveryZone, Extra, Order, OrderAnalytics, OrderLine, OrderStatus, Product, SizeId } from "@/types";
import type { CreatePaymentResult, PaymentMethodId, PaymentProviderId } from "@/types/payments";
import { addOrder, getAllProducts, getCoupons, getDeliveryZones, getExtras, getOfferById, getOrderById, getOrders, getSettings, readCollection, updateOffer, updateOrder, writeCollection } from "@/lib/cms";
import { findZone, getAvailableDays, getLocalNow, normalizePostalCode } from "@/lib/delivery";
import checkoutDe from "@/i18n/messages/de/checkout";
import type { Locale } from "@/i18n/config";
import { computeTotals, validateCoupon } from "@/lib/pricing";
import { cancelOpenPayment, createPayment, providerForMethod, resumePayment, verifyPayment, type PaymentEvent } from "@/lib/payments";
import { isOfferPayable, offerOrderLines, offerOrderParts, offerTotals } from "@/lib/offers-core";
import { markOfferPaidForOrder, offerLocale, withOfferLock } from "@/lib/offers";
import { sendOrderConfirmation } from "@/lib/mail";
import { attachFloristBudgets, EMPTY_BUDGETS, getFloristBudgets } from "@/lib/florist-budget";
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

/**
 * Strips fields that must never leave the server: the token (only ever sent once,
 * on creation), the internal note and the florist's purchase budgets.
 */
export function publicOrderView(order: Order): PublicOrder {
  const { internalNote: _internalNote, token: _token, ...rest } = order;
  void _internalNote; void _token;
  return {
    ...rest,
    lines: rest.lines.map(({ floristBudget: _budget, ...line }) => {
      void _budget;
      return { ...line, extras: line.extras.map(({ floristBudget: _b, ...e }) => { void _b; return e; }) };
    }),
  };
}

/* ---------------- Payload parsing ---------------- */

export type ParseResult = { ok: true; payload: OrderPayload } | { ok: false; status: number; message: string; errors?: FieldErrors };

const PAYMENT_METHODS = new Set(["apple_pay", "google_pay", "card", "paypal", "klarna", "eps"]);
const SIZE_IDS = new Set<SizeId>(["s", "m", "l", "xl", "xxl", "xxxl"]);

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function asInt(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

/** The `items` part of an order payload (also used by the express-checkout quote). */
export function parseOrderItems(input: unknown, opts: { greetingMaxChars: number; messages?: typeof checkoutDe }): { ok: true; items: OrderPayloadItem[] } | { ok: false; status: number; message: string; errors?: FieldErrors } {
  const { api, validation } = opts.messages ?? checkoutDe;
  const body = { items: input };
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 20) {
    return { ok: false, status: 400, message: api.cartEmpty, errors: { items: api.cartEmpty } };
  }
  const items: OrderPayloadItem[] = [];
  for (const raw of body.items) {
    const it = asRecord(raw);
    if (!it) return { ok: false, status: 400, message: api.invalidItem };
    const productId = cleanString(it.productId, 60);
    const sizeId = cleanString(it.sizeId, 4) as SizeId | undefined;
    const quantity = asInt(it.quantity, 1, 20);
    if (!productId || !sizeId || !SIZE_IDS.has(sizeId) || quantity === null) {
      return { ok: false, status: 400, message: api.invalidItem };
    }
    const extras: OrderPayloadItem["extras"] = [];
    if (it.extras !== undefined) {
      if (!Array.isArray(it.extras) || it.extras.length > 20) return { ok: false, status: 400, message: api.invalidExtras };
      for (const rawExtra of it.extras) {
        const ex = asRecord(rawExtra);
        const extraId = ex ? cleanString(ex.extraId, 60) : undefined;
        const q = ex ? asInt(ex.quantity, 1, 20) : null;
        if (!extraId || q === null) return { ok: false, status: 400, message: api.invalidExtras };
        extras.push({ extraId, quantity: q });
      }
    }
    const greeting = {
      message: typeof it.message === "string" ? it.message.replace(/\r\n/g, "\n").trim() : undefined,
      anonymous: it.anonymous === true,
      senderName: cleanString(it.senderName, LIMITS.name + 1),
    };
    const gErr = validateGreetingFields(greeting, opts.greetingMaxChars, validation);
    if (Object.keys(gErr).length) return { ok: false, status: 400, message: api.checkGreeting, errors: gErr };
    const colorId = cleanString(it.colorId, 40);
    const floristNote = typeof it.floristNote === "string" ? it.floristNote.replace(/\r\n/g, "\n").trim().slice(0, 300) || undefined : undefined;
    items.push({
      productId, sizeId, quantity, extras,
      ...(colorId && { colorId }),
      ...(floristNote && { floristNote }),
      message: greeting.message || undefined,
      anonymous: greeting.anonymous,
      senderName: greeting.anonymous ? undefined : greeting.senderName,
    });
  }

  return { ok: true, items };
}

/**
 * Hand-written structural validation of an unknown JSON body – no schema library.
 * `messages`: the `checkout` dictionary of the customer's language (German by default).
 */
export function parseOrderPayload(input: unknown, opts: { greetingMaxChars: number; messages?: typeof checkoutDe }): ParseResult {
  const { api, validation } = opts.messages ?? checkoutDe;
  const body = asRecord(input);
  if (!body) return { ok: false, status: 400, message: api.invalidRequest };

  // items
  const parsedItems = parseOrderItems(body.items, { greetingMaxChars: opts.greetingMaxChars, messages: opts.messages });
  if (!parsedItems.ok) return parsedItems;
  const items = parsedItems.items;

  // recipient
  const r = asRecord(body.recipient);
  if (!r) return { ok: false, status: 400, message: api.recipientMissing };
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
  const rErr = validateRecipientFields(recipient, validation);
  if (Object.keys(rErr).length) return { ok: false, status: 400, message: api.checkRecipient, errors: prefix("recipient", rErr) };

  // delivery
  const d = asRecord(body.delivery);
  const delivery = {
    date: cleanString(d?.date, 10) ?? "",
    windowId: cleanString(d?.windowId, 40),
    note: cleanString(d?.note, LIMITS.note + 1),
  };
  const dErr = validateDeliveryFields(delivery, validation);
  if (Object.keys(dErr).length || !isIsoDate(delivery.date)) {
    return { ok: false, status: 400, message: api.checkDelivery, errors: prefix("delivery", { date: validation.date, ...dErr }) };
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
  const cErr = validateCustomerFields(customer, validation);
  if (Object.keys(cErr).length) return { ok: false, status: 400, message: api.checkCustomer, errors: prefix("customer", cErr) };

  // payment
  const p = asRecord(body.payment);
  const method = cleanString(p?.method, 20);
  if (!method || !PAYMENT_METHODS.has(method)) {
    return { ok: false, status: 400, message: validation.paymentMethod, errors: { "payment.method": validation.paymentMethod } };
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

export function resolveLines(items: OrderPayloadItem[], products: Product[], extras: Extra[]): { ok: true; lines: ResolvedLine[] } | { ok: false; message: string } {
  const lines: ResolvedLine[] = [];
  for (const it of items) {
    const product = products.find((p) => p.id === it.productId && p.active);
    if (!product) return { ok: false, message: "Ein Artikel in deinem Warenkorb ist nicht mehr verfügbar. Bitte prüfe den Warenkorb." };
    if (!product.deliverable) return { ok: false, message: `„${product.name}" kann derzeit nicht geliefert werden.` };
    if (product.pricePending) return { ok: false, message: `„${product.name}" ist noch nicht bestellbar – der Preis folgt in Kürze.` };
    const size = product.sizes.find((s) => s.id === it.sizeId);
    if (!size) return { ok: false, message: `Die gewählte Größe von „${product.name}" ist nicht verfügbar.` };
    if ((product.stock !== null && product.stock < it.quantity) || (size.stock !== undefined && size.stock < it.quantity)) {
      return { ok: false, message: `„${product.name}" ist in dieser Menge leider nicht mehr verfügbar.` };
    }
    const lineExtras: OrderLine["extras"] = [];
    for (const ex of it.extras) {
      const extra = extras.find((e) => e.id === ex.extraId && e.active);
      if (!extra) return { ok: false, message: "Ein Extra in deinem Warenkorb ist nicht mehr verfügbar." };
      lineExtras.push({ extraId: extra.id, name: extra.name, quantity: ex.quantity, unitPrice: extra.price, ...(extra.image && { image: extra.image }) });
    }
    // Products with colours need one chosen – the florist must know which.
    const colors = product.colorOptions ?? [];
    const color = colors.length ? colors.find((c) => c.id === it.colorId) : undefined;
    if (colors.length && !color) return { ok: false, message: `Bitte wähle eine Farbe für „${product.name}".` };
    // The photo of the chosen colour/size if there is one – the florist binds "wie auf dem Foto".
    const image = color?.image || size.image || ((product.images.find((i) => i.kind === "front") ?? product.images[0])?.src ?? "");
    lines.push({
      product,
      line: {
        productId: product.id, productName: product.name, sizeId: size.id, sizeLabel: size.label, ...(size.stems ? { stems: size.stems } : {}),
        quantity: it.quantity, unitPrice: size.price, image, extras: lineExtras,
        message: it.message, anonymous: it.anonymous, senderName: it.senderName,
        ...(color && { color: color.label }),
        ...(it.floristNote && { floristNote: it.floristNote }),
      },
      cartItem: {
        id: `${product.id}-${size.id}`, productId: product.id, sizeId: size.id, quantity: it.quantity,
        extras: lineExtras.map((e) => ({ extraId: e.extraId, quantity: e.quantity, name: e.name, price: e.unitPrice, image: e.image ?? "" })),
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
/** Error codes of `priceOrder` – the express checkout maps them to translated texts. */
export type PriceOrderCode = "items" | "zone" | "date" | "window" | "coupon" | "min_order";

export type PriceOrderResult =
  | {
      ok: true;
      lines: ResolvedLine[];
      zone: DeliveryZone;
      window?: { id: string; label: string; from?: string; to?: string };
      coupon: Coupon | null;
      totals: ReturnType<typeof computeTotals>;
    }
  | { ok: false; status: number; code: PriceOrderCode; message: string; errors?: FieldErrors };

/**
 * The price-relevant half of an order, shared by `createOrderFromPayload` and the
 * express-checkout quote: resolves every line from the catalog, the zone of the PLZ,
 * the delivery day and window, the coupon and the totals (minimum order value).
 * Never trusts client prices.
 */
export async function priceOrder(input: { items: OrderPayloadItem[]; zip: string; date: string; windowId?: string; couponCode?: string }): Promise<PriceOrderResult> {
  const [products, extras, zones, coupons, settings] = await Promise.all([
    getAllProducts(), getExtras(), getDeliveryZones(), getCoupons(), getSettings(),
  ]);

  const resolved = resolveLines(input.items, products, extras);
  if (!resolved.ok) return { ok: false, status: 409, code: "items", message: resolved.message, errors: { items: resolved.message } };
  const lines = resolved.lines;

  // Zone & delivery day
  const zone: DeliveryZone | null = findZone(input.zip, zones);
  if (!zone) {
    return { ok: false, status: 400, code: "zone", message: "In dieses Gebiet liefern wir derzeit leider noch nicht.", errors: { "recipient.zip": "In dieses Gebiet liefern wir derzeit leider noch nicht." } };
  }
  const now = getLocalNow(settings.timezone);
  const days = getAvailableDays({
    zone, settings, now,
    product: { sameDayCapable: lines.every((l) => l.product.sameDayCapable), deliverable: lines.every((l) => l.product.deliverable) },
  });
  const day = days.find((d) => d.date === input.date);
  if (!day) {
    return { ok: false, status: 400, code: "date", message: "Das gewählte Lieferdatum ist nicht mehr verfügbar. Bitte wähle ein anderes Datum.", errors: { "delivery.date": "Dieses Datum ist nicht mehr verfügbar." } };
  }
  let window: { id: string; label: string; from?: string; to?: string } | undefined;
  if (input.windowId) {
    const win = day.windows.find((w) => w.id === input.windowId);
    if (!win) return { ok: false, status: 400, code: "window", message: "Das gewählte Zeitfenster ist an diesem Tag nicht verfügbar.", errors: { "delivery.windowId": "Bitte wähle ein anderes Zeitfenster." } };
    window = { id: win.id, label: win.label, from: win.from, to: win.to };
  }

  // Coupon
  let coupon: Coupon | null = null;
  const cartItems = lines.map((l) => l.cartItem);
  if (input.couponCode) {
    coupon = coupons.find((c) => c.code.toUpperCase() === input.couponCode) ?? null;
    const subtotal = cartItems.reduce((s, i) => s + i.snapshot.unitPrice * i.quantity + i.extras.reduce((x, e) => x + e.price * e.quantity, 0), 0);
    const v = validateCoupon(coupon, subtotal, now.date);
    if (!v.ok) return { ok: false, status: 400, code: "coupon", message: v.error ?? "Dieser Gutschein ist nicht gültig.", errors: { couponCode: v.error ?? "Ungültiger Code." } };
  }

  const totals = computeTotals({ items: cartItems, zone, windowId: input.windowId, coupon, today: now.date });
  if (totals.belowMinOrder) {
    return { ok: false, status: 400, code: "min_order", message: `Für dieses Liefergebiet gilt ein Mindestbestellwert von ${totals.minOrder.toFixed(2).replace(".", ",")} €.` };
  }
  return { ok: true, lines, zone, window, coupon, totals };
}

export async function createOrderFromPayload(payload: OrderPayload, opts: { siteUrl: string; locale?: Locale; analytics?: OrderAnalytics; express?: boolean }): Promise<CreateOrderOutcome> {
  const settings = await getSettings();
  const paymentConfig = settings.payments.find((p) => p.id === payload.payment.method && p.enabled);
  const provider = paymentConfig ? providerForMethod(paymentConfig.id) : null;
  if (!paymentConfig || !provider) {
    return { ok: false, status: 400, message: "Diese Zahlungsart ist derzeit nicht verfügbar.", errors: { "payment.method": "Bitte wähle eine andere Zahlungsart." } };
  }

  const priced = await priceOrder({ items: payload.items, zip: payload.recipient.zip, date: payload.delivery.date, windowId: payload.delivery.windowId, couponCode: payload.couponCode });
  if (!priced.ok) return { ok: false, status: priced.status, message: priced.message, ...(priced.errors ? { errors: priced.errors } : {}) };
  const { lines, zone, coupon, totals } = priced;
  const windowLabel = priced.window?.label;
  const windowFrom = priced.window?.from;
  const windowTo = priced.window?.to;

  // Reserve stock before anything is persisted – the check inside the lock is authoritative.
  const orderLines = attachFloristBudgets(lines.map((l) => l.line), await getFloristBudgets().catch((err: unknown) => {
    console.error("[orders] florist budgets unavailable – order slip goes out without budget", err);
    return EMPTY_BUDGETS;
  }));
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
      date: payload.delivery.date, windowId: payload.delivery.windowId, windowLabel, windowFrom, windowTo, note: payload.delivery.note,
      zoneId: zone.id, zoneName: zone.name, fee: totals.delivery,
      // "Express" = today's earliest window (checkout badge); only believed for a delivery today.
      ...(opts.express && payload.delivery.date === getLocalNow(settings.timezone).date ? { express: true } : {}),
    },
    customer: { firstName: payload.customer.firstName, lastName: payload.customer.lastName, email: payload.customer.email, phone: payload.customer.phone },
    lines: orderLines,
    coupon: coupon && totals.discount > 0 ? { code: coupon.code, discount: totals.discount } : coupon?.type === "free_shipping" ? { code: coupon.code, discount: 0 } : undefined,
    totals: { subtotal: totals.itemsSubtotal, extras: totals.extrasSubtotal, delivery: totals.delivery, discount: totals.discount, total: totals.total },
    payment: { method: paymentConfig.id, status: "pending", provider },
    // Shop language for the customer mails; German orders carry none (as before).
    ...(opts.locale && opts.locale !== "de" ? { locale: opts.locale } : {}),
    ...(opts.analytics ? { analytics: opts.analytics } : {}),
  };

  try {
    await addOrder(order);
  } catch (err) {
    await releaseStock(orderLines);
    throw err;
  }

  return startPayment(order, opts.siteUrl);
}

/**
 * Provider step for a stored order (payment pending): creates the provider payment and applies the immediate result. Mock pays at
 * once; Stripe and PayPal stay pending until confirm endpoint or webhook.
 */
async function startPayment(order: Order, siteUrl: string): Promise<CreateOrderOutcome> {
  const id = order.id;
  const provider = order.payment.provider as PaymentProviderId;
  let payment: CreatePaymentResult;
  try {
    payment = await createPayment({ order, siteUrl });
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

/* ---------------- Resuming an open checkout payment ---------------- */

export type ResumeCheckoutOutcome =
  | { ok: true; order: Order; payment: CreatePaymentResult }
  | { ok: false; status: number; code: "not_found" | "gone" | "method" | "payment" };

function sameToken(expected: string, given: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The customer tries again (same browser session, same cart and details) after a
 * cancelled or failed Stripe payment: continue the stored order and its PaymentIntent
 * instead of creating a second order. Only for unpaid checkout orders paid via Stripe
 * whose intent can still be paid; the amount stays the stored one. `gone` = start a new
 * order (the old one is marked failed and its stock released, so nothing is held twice).
 */
export async function resumeCheckoutOrder(id: string, token: string, method: PaymentMethodId, opts: { siteUrl: string }): Promise<ResumeCheckoutOutcome> {
  const order = await getOrderById(id);
  if (!order || order.offerId || !sameToken(order.token, token)) return { ok: false, status: 404, code: "not_found" };
  const settings = await getSettings();
  const enabled = settings.payments.some((p) => p.id === method && p.enabled);
  if (!enabled || providerForMethod(method) !== "stripe") return { ok: false, status: 400, code: "method" };
  if (order.payment.provider !== "stripe" || order.payment.status !== "pending" || !order.payment.intentId) return { ok: false, status: 409, code: "gone" };

  const current = order.payment.method === method ? order : (await updateOrder(order.id, (o) => ({ ...o, payment: { ...o.payment, method } }))) ?? order;
  let resumed: CreatePaymentResult;
  try {
    resumed = await resumePayment({ order: current, siteUrl: opts.siteUrl });
  } catch (err) {
    // Unknown state of the open payment – never start a second one blindly.
    console.error(`[orders] resuming the payment of ${order.id} failed`, err);
    return { ok: false, status: 503, code: "payment" };
  }
  if (resumed.status === "paid") {
    const paid = await markOrderPaid(order.id, { provider: resumed.provider, reference: resumed.reference, intentId: resumed.intentId, note: "Zahlung bestätigt" });
    return { ok: true, order: paid ?? current, payment: resumed };
  }
  // Still payable (client secret) or already processing (no secret – the status page follows the webhook).
  if (resumed.status === "pending") return { ok: true, order: current, payment: resumed };
  await markOrderPaymentFailed(order.id, { note: "Zahlung abgebrochen – neue Bestellung angelegt", intentId: resumed.intentId });
  return { ok: false, status: 409, code: "gone" };
}

/* ---------------- Orders from individual offers ---------------- */

export type OfferPaymentOutcome =
  | (Extract<CreateOrderOutcome, { ok: true }> & { reused: boolean })
  | { ok: false; status: number; code: "not_found" | "paid" | "unavailable" | "method" | "payment"; message: string; order?: Order };

/**
 * Turns a sent, still valid offer into an order and starts its payment.
 *
 * Every amount comes from the stored offer – the client only names the payment
 * method. Idempotent per offer: while an earlier order of the offer still waits for
 * its payment with the same provider (and the offer was not edited since), that order
 * and its provider payment are reused (Stripe: the same PaymentIntent). Before a new
 * order replaces an open one, the open payment is verified and cancelled (Stripe
 * intent), so an offer can never be paid twice. Serialised per offer.
 *
 * Custom items become `custom` order lines (no stock); shop products keep their stock
 * rules. The order carries the offer's language, the free window ("14:00–16:00 Uhr"),
 * the zone of the ZIP, the billing address, the florist note and `offerId`.
 */
export async function createOrderFromOffer(offerId: string, method: PaymentMethodId, opts: { siteUrl: string; analytics?: OrderAnalytics }): Promise<OfferPaymentOutcome> {
  return withOfferLock(offerId, async () => {
    const [offer, settings, zones] = await Promise.all([getOfferById(offerId), getSettings(), getDeliveryZones()]);
    if (!offer) return { ok: false, status: 404, code: "not_found", message: "Angebot nicht gefunden." };
    const today = getLocalNow(settings.timezone).date;
    if (offer.status === "paid") return { ok: false, status: 409, code: "paid", message: "Dieses Angebot ist bereits bezahlt." };
    if (!isOfferPayable(offer, today)) return { ok: false, status: 410, code: "unavailable", message: "Dieses Angebot ist nicht mehr gültig." };

    const paymentConfig = settings.payments.find((p) => p.id === method && p.enabled);
    const provider = paymentConfig ? providerForMethod(paymentConfig.id) : null;
    if (!paymentConfig || !provider) return { ok: false, status: 400, code: "method", message: "Diese Zahlungsart ist derzeit nicht verfügbar." };

    const totals = offerTotals(offer);

    // An earlier attempt of this offer?
    const previous = offer.orderId ? await getOrderById(offer.orderId) : null;
    if (previous && previous.payment.status === "paid") {
      await markOfferPaidForOrder(previous);
      return { ok: false, status: 409, code: "paid", message: "Dieses Angebot ist bereits bezahlt.", order: previous };
    }
    if (previous && previous.payment.status === "pending") {
      const stale = previous.createdAt < offer.updatedAt || previous.totals.total !== totals.total;
      const replace = stale || previous.payment.provider !== provider || provider === "mock";
      if (!replace) {
        const reusable = previous.payment.method === method ? previous : (await updateOrder(previous.id, (o) => ({ ...o, payment: { ...o.payment, method } }))) ?? previous;
        let resumed: CreatePaymentResult;
        try {
          resumed = await resumePayment({ order: reusable, siteUrl: opts.siteUrl });
        } catch (err) {
          // Unknown state of the open payment – never start a second one blindly.
          console.error(`[offers] resuming the payment of ${previous.id} failed`, err);
          return { ok: false, status: 503, code: "payment", message: "Die Zahlung konnte gerade nicht gestartet werden. Bitte versuch es gleich noch einmal." };
        }
        if (resumed.status === "paid") {
          const paid = await markOrderPaid(previous.id, { provider: resumed.provider, reference: resumed.reference, intentId: resumed.intentId, note: "Zahlung bestätigt" });
          return { ok: true, order: paid ?? reusable, payment: resumed, reused: true };
        }
        if (resumed.status === "pending") return { ok: true, order: reusable, payment: resumed, reused: true };
        // The old payment can no longer be completed (e.g. intent cancelled) – a fresh order follows.
        await markOrderPaymentFailed(previous.id, { note: resumed.message ?? "Zahlung abgebrochen", intentId: resumed.intentId });
      }
      if (replace) {
        // Edited offer or another provider: the open payment must never complete.
        try {
          const verified = await verifyPayment(previous);
          if (verified.status === "paid") {
            const paid = await markOrderPaid(previous.id, { reference: verified.reference, intentId: verified.intentId, note: "Zahlung nachträglich bestätigt" });
            return { ok: false, status: 409, code: "paid", message: "Dieses Angebot ist bereits bezahlt.", order: paid ?? previous };
          }
          await cancelOpenPayment(previous);
        } catch (err) {
          console.error(`[offers] could not cancel the open payment of ${previous.id}`, err);
          return { ok: false, status: 409, code: "payment", message: "Eine frühere Zahlung für dieses Angebot ist noch offen. Bitte versuch es in ein paar Minuten noch einmal." };
        }
        await markOrderPaymentFailed(previous.id, { note: stale ? "Angebot geändert – neue Bestellung angelegt" : "Zahlungsart gewechselt – neue Bestellung angelegt" });
      }
    }

    // Lines: custom items as entered; shop products and extras get the stored florist budget when none was entered.
    const budgets = await getFloristBudgets().catch(() => EMPTY_BUDGETS);
    const lines = offerOrderLines(offer, { cardsEnabled: settings.greetingCard.enabled === true }).map((l) => ({
      ...l,
      ...(l.custom ? {} : { floristBudget: l.floristBudget ?? budgets.products[l.productId]?.[l.sizeId] }),
      extras: l.extras.map((e) => ({ ...e, floristBudget: budgets.extras[e.extraId] })),
    }));
    const reserved = await reserveStock(lines);
    if (!reserved.ok) return { ok: false, status: 409, code: "unavailable", message: reserved.message };

    const zone = findZone(offer.recipient.zip, zones);
    const id = await generateOrderId();
    const createdAt = new Date().toISOString();
    const locale = offerLocale(offer);
    const order: Order = {
      id, token: randomBytes(12).toString("hex"), createdAt, status: "received",
      history: [{ status: "received", at: createdAt, note: `Aus Angebot ${offer.id} – Partner und Zustellung von Hand organisieren` }],
      ...offerOrderParts(offer, offer.delivery.enabled ? zone : null, today),
      customer: { firstName: offer.customer.firstName, lastName: offer.customer.lastName, email: offer.customer.email, phone: offer.customer.phone ?? "" },
      lines,
      totals: { subtotal: totals.items, extras: totals.extras, delivery: totals.delivery, discount: 0, total: totals.total },
      payment: { method: paymentConfig.id, status: "pending", provider },
      ...(locale !== "de" ? { locale } : {}),
      offerId: offer.id,
      ...(opts.analytics ? { analytics: opts.analytics } : {}),
      ...(offer.floristNote ? { floristNote: offer.floristNote } : {}),
      ...(offer.billing ? { billing: offer.billing } : {}),
    };

    try {
      await addOrder(order);
    } catch (err) {
      await releaseStock(lines);
      throw err;
    }
    await updateOffer(offer.id, (o) => ({ ...o, orderId: id, history: [...o.history, { at: createdAt, note: `Zahlung gestartet (${paymentConfig.label}) – Bestellung ${id}` }] }));

    const started = await startPayment(order, opts.siteUrl);
    return started.ok ? { ...started, reused: false } : { ok: false, status: started.status, code: "payment", message: started.message };
  });
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

  // An order from an individual offer settles the offer ("Bezahlt").
  if (updated.offerId) await markOfferPaidForOrder(updated).catch((err) => console.error("[offers] marking offer paid failed", err));

  // A payment that arrives after we already gave the units back (late webhook) re-reserves them.
  if (wasReleased) await reserveStock(updated.lines).catch((err) => console.error("[orders] re-reserving stock failed", err));

  // Mails (customer, team, florist) and the rider booking (RiderX, if configured) run
  // after the response, so a slow mail server, courier or geocoder never delays the
  // payment confirmation – and `after` keeps a serverless function alive until they
  // are done (a plain fire-and-forget promise can be cut off). Outside a request
  // (scripts, tests) `after` is unavailable – then run inline. Never throws.
  const followUp = async () => {
    await sendOrderConfirmation(updated).catch((err) => console.error("[mail] confirmation failed", err));
    // Revenue for analytics – server-side, exactly once (only with the customer's statistics consent).
    await trackPurchase(updated.id);
    // Orders from individual offers are handled by the team by hand: never an automatic rider.
    if (!updated.offerId) await bookCourierSafely(updated.id);
  };
  try {
    after(followUp);
  } catch {
    await followUp();
  }
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
  const updated = await updateOrder(id, (o) => {
    if (o.payment.status === "refunded") return o;
    return {
      ...o,
      history: [...o.history, { status: o.status, at: new Date().toISOString(), note: info.note ?? "Zahlung erstattet" }],
      payment: { ...o.payment, status: "refunded", reference: info.reference ?? o.payment.reference },
    };
  });
  if (updated?.payment.status === "refunded") {
    const report = () => trackRefund(updated.id);
    try { after(report); } catch { await report(); }
  }
  return updated;
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
