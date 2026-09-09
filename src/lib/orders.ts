import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import type { CartItem, Coupon, DeliveryZone, Extra, Order, OrderLine, OrderStatus, Product, SizeId } from "@/types";
import { addOrder, getAllProducts, getCoupons, getDeliveryZones, getExtras, getOrderById, getSettings } from "@/lib/cms";
import { findZone, getAvailableDays, getLocalNow, normalizePostalCode } from "@/lib/delivery";
import { computeTotals, validateCoupon } from "@/lib/pricing";
import { processPayment } from "@/lib/payments";
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

/**
 * Builds and persists an order from an already parsed payload.
 * Everything price-relevant is re-resolved from the catalog; the client's
 * snapshots are ignored.
 */
export async function createOrderFromPayload(payload: OrderPayload): Promise<CreateOrderResult> {
  const [products, extras, zones, coupons, settings] = await Promise.all([
    getAllProducts(), getExtras(), getDeliveryZones(), getCoupons(), getSettings(),
  ]);

  const paymentConfig = settings.payments.find((p) => p.id === payload.payment.method && p.enabled);
  if (!paymentConfig) return { ok: false, status: 400, message: "Diese Zahlungsart ist derzeit nicht verfügbar.", errors: { "payment.method": "Bitte wähle eine andere Zahlungsart." } };

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

  // Build the order
  const id = await generateOrderId();
  const token = randomBytes(12).toString("hex"); // 24 hex chars
  const createdAt = new Date().toISOString();

  const payment = await processPayment({ method: paymentConfig.id, amount: totals.total, orderId: id, provider: paymentConfig.provider ?? "mock" });
  if (payment.status === "failed") {
    return { ok: false, status: 402, message: payment.message ?? "Die Zahlung konnte nicht durchgeführt werden. Bitte versuch es erneut." };
  }

  const history: Order["history"] = [{ status: "received", at: createdAt }];
  let status: OrderStatus = "received";
  if (payment.status === "paid") {
    status = "paid";
    history.push({ status: "paid", at: new Date().toISOString(), note: payment.provider === "mock" ? "Testzahlung (mock)" : payment.reference });
  }

  const order: Order = {
    id, token, createdAt, status, history,
    recipient: { ...payload.recipient, country: "AT" },
    delivery: {
      date: payload.delivery.date, windowId: payload.delivery.windowId, windowLabel, note: payload.delivery.note,
      zoneId: zone.id, zoneName: zone.name, fee: totals.delivery,
    },
    customer: { firstName: payload.customer.firstName, lastName: payload.customer.lastName, email: payload.customer.email, phone: payload.customer.phone },
    lines: lines.map((l) => l.line),
    coupon: coupon && totals.discount > 0 ? { code: coupon.code, discount: totals.discount } : coupon?.type === "free_shipping" ? { code: coupon.code, discount: 0 } : undefined,
    totals: { subtotal: totals.itemsSubtotal, extras: totals.extrasSubtotal, delivery: totals.delivery, discount: totals.discount, total: totals.total },
    payment: { method: paymentConfig.id, status: payment.status, reference: payment.reference },
  };

  await addOrder(order);
  // Fire-and-forget: a failing mail stub must never fail the order.
  sendOrderConfirmation(order).catch((err) => console.error("[mail] confirmation failed", err));

  return { ok: true, order };
}
