/**
 * Individual offers – pure rules (client-safe, no I/O).
 *
 * An offer is a priced proposal the team writes for one customer (admin → Angebote):
 * free items and/or shop products with editable prices, extras, a delivery fee and a
 * free time window. The customer pays it online on `/angebot/[token]`; paying creates a
 * regular order (`createOrderFromOffer` in src/lib/orders.ts). Storage and mails live
 * in src/lib/offers.ts.
 */
import type { DeliveryZone, ISODate, Offer, OfferExtra, OfferItem, OfferStatus, Order, OrderLine, SiteSettings, SizeId } from "@/types";
import { addDays, weekdayOf } from "@/lib/delivery";
import { isEmail, isIsoDate, isPhone } from "@/lib/order-payload";

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  draft: "Entwurf",
  sent: "Gesendet",
  viewed: "Angesehen",
  paid: "Bezahlt",
  expired: "Abgelaufen",
  cancelled: "Storniert",
};

/** Days an offer stays payable by default (today + 3, Vienna time). */
export const DEFAULT_VALIDITY_DAYS = 3;
/** Smallest amount a card payment can carry. */
export const MIN_OFFER_TOTAL = 1;

export const OFFER_LIMITS = {
  name: 80,
  email: 120,
  phone: 30,
  title: 120,
  description: 1000,
  street: 120,
  houseNumber: 12,
  addition: 120,
  city: 80,
  company: 120,
  note: 1000,
  greeting: 500,
  vatId: 30,
  items: 20,
  quantity: 99,
  price: 100_000,
} as const;

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export interface OfferTotals {
  items: number;
  extras: number;
  delivery: number;
  total: number;
}

/** Totals of an offer – the only amounts a payment for it may carry. */
export function offerTotals(offer: Pick<Offer, "items" | "extras" | "delivery">): OfferTotals {
  const items = round2(offer.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0));
  const extras = round2(offer.extras.reduce((s, e) => s + e.unitPrice * e.quantity, 0));
  const delivery = round2(offer.delivery.fee);
  return { items, extras, delivery, total: round2(items + extras + delivery) };
}

/** Effective status: paid/cancelled/draft as stored, then "expired" after `validUntil`, then "viewed"/"sent". */
export function offerStatus(offer: Pick<Offer, "status" | "validUntil" | "viewedAt">, today: ISODate): OfferStatus {
  if (offer.status === "paid" || offer.status === "cancelled" || offer.status === "draft") return offer.status;
  if (today > offer.validUntil) return "expired";
  return offer.viewedAt ? "viewed" : "sent";
}

/** Only sent (or viewed) offers within their validity can be paid. */
export function isOfferPayable(offer: Pick<Offer, "status" | "validUntil" | "viewedAt">, today: ISODate) {
  const s = offerStatus(offer, today);
  return s === "sent" || s === "viewed";
}

export function defaultValidUntil(today: ISODate, days = DEFAULT_VALIDITY_DAYS): ISODate {
  return addDays(today, days);
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export function isTime(v: string) {
  return HHMM.test(v);
}

/** "14:00–16:00 Uhr" – the window label stored on the order (same style as the zone windows). */
export function offerWindowLabel(from: string, to: string) {
  return `${from}–${to} Uhr`;
}

/** Time of an offer's delivery as shown everywhere: the free text, else the window; undefined when neither is set. */
export function offerTimeLabel(d: Pick<Offer["delivery"], "from" | "to" | "text">): string | undefined {
  const window = d.from && d.to ? offerWindowLabel(d.from, d.to) : undefined;
  if (d.text && window) return `${window} (${d.text})`;
  return d.text || window;
}

/** Whether the zone normally delivers on that date (weekday + blackout); a mismatch is a warning only. */
export function deliveryDayWarning(date: ISODate, zone: Pick<DeliveryZone, "deliveryDays" | "name"> | null, settings: Pick<SiteSettings, "blackoutDates">): string | null {
  if (!isIsoDate(date)) return null;
  if (settings.blackoutDates.includes(date)) return "An diesem Tag ist laut Einstellungen kein Liefertag (Sperrtag).";
  if (zone && !zone.deliveryDays.includes(weekdayOf(date))) return `${zone.name} wird an diesem Wochentag normalerweise nicht beliefert.`;
  return null;
}

/* ---------------- Order lines ---------------- */

/** Order lines for an offer: custom items as `custom` lines, products with the offer price; extras ride on the first line. */
export function offerOrderLines(offer: Pick<Offer, "items" | "extras" | "greeting">, opts: { cardsEnabled: boolean }): OrderLine[] {
  const lines: OrderLine[] = offer.items.map((it) => ({
    productId: it.kind === "product" && it.productId ? it.productId : "custom",
    productName: it.title,
    sizeId: (it.kind === "product" && it.sizeId ? it.sizeId : "m") as SizeId,
    sizeLabel: it.kind === "product" ? it.sizeLabel ?? "" : "",
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    image: it.image ?? "",
    extras: [],
    ...(it.kind === "custom" ? { custom: true } : {}),
    ...(it.description ? { description: it.description } : {}),
    ...(it.floristBudget !== undefined ? { floristBudget: it.floristBudget } : {}),
  }));
  if (lines.length) {
    lines[0].extras = offer.extras.map((e) => ({ extraId: e.extraId, name: e.name, quantity: e.quantity, unitPrice: e.unitPrice, ...(e.image ? { image: e.image } : {}) }));
    if (opts.cardsEnabled && offer.greeting?.message) {
      lines[0].message = offer.greeting.message;
      if (offer.greeting.senderName) lines[0].senderName = offer.greeting.senderName;
    }
  }
  return lines;
}

/** Recipient address addition for the order: a meeting point is marked as such for florist and courier. */
export function offerRecipientAddition(r: Pick<Offer["recipient"], "kind" | "addition">): string | undefined {
  if (!r.addition) return undefined;
  return r.kind === "meeting" ? `Treffpunkt: ${r.addition}` : r.addition;
}

/**
 * Recipient and delivery of the order an offer becomes. Without a delivery the order
 * carries `delivery.none` ("Nach Absprache"), the offer's date if one was set (else
 * `today`) and the customer as contact; the zone comes from the ZIP when it matches one.
 */
export function offerOrderParts(offer: Offer, zone: Pick<DeliveryZone, "id" | "name"> | null, today: ISODate): Pick<Order, "recipient" | "delivery"> {
  const d = offer.delivery;
  const t = offerTotals(offer);
  const base = {
    fee: t.delivery,
    ...(d.note ? { note: d.note } : {}),
    zoneId: zone?.id ?? "angebot",
    zoneName: zone?.name ?? (d.enabled ? "Individuell (Angebot)" : "Keine Lieferung (Angebot)"),
  };
  const timeLabel = offerTimeLabel(d);
  const window = d.from && d.to ? { windowFrom: d.from, windowTo: d.to } : {};
  if (!d.enabled) {
    const c = offer.customer;
    return {
      recipient: { firstName: c.firstName, lastName: c.lastName, street: "", houseNumber: "", zip: "", city: "", country: "AT", phone: c.phone ?? "" },
      delivery: { date: d.date || today, ...(timeLabel ? { windowLabel: timeLabel } : {}), ...window, ...base, none: true },
    };
  }
  const r = offer.recipient;
  const addition = offerRecipientAddition(r);
  return {
    recipient: { firstName: r.firstName, lastName: r.lastName, ...(r.company ? { company: r.company } : {}), street: r.street, houseNumber: r.houseNumber, ...(addition ? { addition } : {}), zip: r.zip, city: r.city, country: "AT", phone: r.phone },
    delivery: { date: d.date || today, ...(timeLabel ? { windowLabel: timeLabel } : {}), ...window, ...base },
  };
}

/**
 * The offer in the shape of an (unpaid) order – only for rendering the offer mail with the
 * same item/total blocks as the order mails. Never stored.
 */
export function offerPreviewOrder(offer: Offer, opts: { cardsEnabled: boolean }): Order {
  const t = offerTotals(offer);
  const zone = offer.delivery.zoneId ? { id: offer.delivery.zoneId, name: offer.delivery.zoneName ?? "" } : null;
  return {
    id: offer.id, token: "", createdAt: offer.createdAt, status: "received", history: [],
    ...offerOrderParts(offer, zone, offer.validUntil),
    customer: { firstName: offer.customer.firstName, lastName: offer.customer.lastName, email: offer.customer.email, phone: offer.customer.phone ?? "" },
    lines: offerOrderLines(offer, opts),
    totals: { subtotal: t.items, extras: t.extras, delivery: t.delivery, discount: 0, total: t.total },
    payment: { method: "card", status: "pending" },
    offerId: offer.id,
    ...(offer.locale !== "de" ? { locale: offer.locale } : {}),
  };
}

/* ---------------- Admin input ---------------- */

/** What the admin form sends (prices as numbers, everything else as strings). */
export interface OfferInput {
  locale?: unknown;
  customer?: unknown;
  items?: unknown;
  extras?: unknown;
  delivery?: unknown;
  recipient?: unknown;
  greeting?: unknown;
  floristNote?: unknown;
  billing?: unknown;
  internalNote?: unknown;
  validUntil?: unknown;
}

/** The catalogue the input is resolved against. */
export interface OfferCatalog {
  products: { id: string; name: string; active: boolean; images: { src: string; kind?: string }[]; sizes: { id: SizeId; label: string; price: number; image?: string }[] }[];
  extras: { id: string; name: string; image?: string; active: boolean }[];
  locales: readonly string[];
}

export type OfferDraft = Omit<Offer, "id" | "token" | "createdAt" | "updatedAt" | "status" | "history">;
export type OfferInputResult = { ok: true; offer: OfferDraft } | { ok: false; errors: Record<string, string> };

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "";
}
function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Validates and normalises the admin form. Prices are rounded to cents; product/extra names come from the catalogue. */
export function parseOfferInput(input: OfferInput, catalog: OfferCatalog): OfferInputResult {
  const errors: Record<string, string> = {};
  const L = OFFER_LIMITS;

  const locale = typeof input.locale === "string" && catalog.locales.includes(input.locale) ? input.locale : "de";

  const c = rec(input.customer);
  const customer = { firstName: str(c.firstName, L.name), lastName: str(c.lastName, L.name), email: str(c.email, L.email).toLowerCase(), phone: str(c.phone, L.phone) };
  if (!customer.firstName) errors["customer.firstName"] = "Vorname fehlt.";
  if (!customer.email || !isEmail(customer.email)) errors["customer.email"] = "Bitte eine gültige E-Mail-Adresse angeben.";
  if (customer.phone && !isPhone(customer.phone)) errors["customer.phone"] = "Telefonnummer ungültig.";

  const items: OfferItem[] = [];
  const rawItems = Array.isArray(input.items) ? input.items.slice(0, L.items) : [];
  rawItems.forEach((raw, i) => {
    const it = rec(raw);
    const kind = it.kind === "product" ? "product" : "custom";
    const quantity = Math.trunc(num(it.quantity) ?? 1);
    const unitPrice = num(it.unitPrice);
    const budget = num(it.floristBudget);
    const key = `items.${i}`;
    if (quantity < 1 || quantity > L.quantity) errors[`${key}.quantity`] = "Menge 1–99.";
    if (unitPrice === null || unitPrice < 0 || unitPrice > L.price) errors[`${key}.unitPrice`] = "Preis ungültig.";
    const base = {
      id: str(it.id, 40) || `i${i + 1}`,
      quantity: Math.max(1, Math.min(L.quantity, quantity)),
      unitPrice: round2(Math.max(0, unitPrice ?? 0)),
      ...(budget !== null && budget >= 0 ? { floristBudget: round2(budget) } : {}),
    };
    const description = str(it.description, L.description);
    const image = str(it.image, 500);
    if (image && !/^(\/|https:\/\/)/.test(image)) errors[`${key}.image`] = "Bild-URL ungültig.";
    if (kind === "product") {
      const product = catalog.products.find((p) => p.id === it.productId);
      const size = product?.sizes.find((s) => s.id === it.sizeId);
      if (!product || !size) { errors[`${key}.productId`] = "Produkt und Größe wählen."; return; }
      const fallbackImage = size.image || (product.images.find((im) => im.kind === "front") ?? product.images[0])?.src || "";
      items.push({ ...base, kind, title: product.name, productId: product.id, sizeId: size.id, sizeLabel: size.label, image: image || fallbackImage, ...(description ? { description } : {}) });
    } else {
      const title = str(it.title, L.title);
      if (!title) errors[`${key}.title`] = "Titel fehlt.";
      items.push({ ...base, kind, title, ...(description ? { description } : {}), ...(image ? { image } : {}) });
    }
  });
  if (!rawItems.length) errors.items = "Mindestens eine Position anlegen.";

  const extras: OfferExtra[] = [];
  (Array.isArray(input.extras) ? input.extras.slice(0, L.items) : []).forEach((raw, i) => {
    const e = rec(raw);
    const extra = catalog.extras.find((x) => x.id === e.extraId);
    const quantity = Math.trunc(num(e.quantity) ?? 1);
    const unitPrice = num(e.unitPrice);
    if (!extra) { errors[`extras.${i}.extraId`] = "Extra wählen."; return; }
    if (quantity < 1 || quantity > L.quantity) errors[`extras.${i}.quantity`] = "Menge 1–99.";
    if (unitPrice === null || unitPrice < 0 || unitPrice > L.price) errors[`extras.${i}.unitPrice`] = "Preis ungültig.";
    extras.push({ extraId: extra.id, name: extra.name, quantity: Math.max(1, Math.min(L.quantity, quantity)), unitPrice: round2(Math.max(0, unitPrice ?? 0)), ...(extra.image ? { image: extra.image } : {}) });
  });

  const d = rec(input.delivery);
  const fee = num(d.fee);
  const enabled = d.enabled !== false;
  const delivery: Offer["delivery"] = {
    enabled, date: str(d.date, 10), from: str(d.from, 5), to: str(d.to, 5), fee: round2(Math.max(0, fee ?? 0)),
    ...(str(d.text, 120) ? { text: str(d.text, 120) } : {}),
    ...(str(d.note, L.note) ? { note: str(d.note, L.note) } : {}),
  };
  if (delivery.date && !isIsoDate(delivery.date)) errors["delivery.date"] = "Datum ungültig.";
  if (enabled && !delivery.date) errors["delivery.date"] = "Lieferdatum fehlt (oder „Keine Lieferung“ wählen).";
  if (delivery.from || delivery.to) {
    if (!isTime(delivery.from)) errors["delivery.from"] = "Uhrzeit von (HH:MM) – oder beide Felder leer lassen.";
    if (!isTime(delivery.to)) errors["delivery.to"] = "Uhrzeit bis (HH:MM) – oder beide Felder leer lassen.";
    else if (isTime(delivery.from) && delivery.to <= delivery.from) errors["delivery.to"] = "Ende muss nach dem Beginn liegen.";
  }
  if (d.fee !== undefined && d.fee !== "" && (fee === null || fee < 0 || fee > 1000)) errors["delivery.fee"] = "Liefergebühr ungültig.";

  const r = rec(input.recipient);
  const recipient = {
    kind: (r.kind === "meeting" ? "meeting" : "address") as "meeting" | "address",
    firstName: str(r.firstName, L.name), lastName: str(r.lastName, L.name), company: str(r.company, L.company) || undefined,
    phone: str(r.phone, L.phone), street: str(r.street, L.street), houseNumber: str(r.houseNumber, L.houseNumber),
    addition: str(r.addition, L.addition) || undefined, zip: str(r.zip, 12), city: str(r.city, L.city),
  };
  if (enabled) {
    // Free-form place: an address or a described meeting point, any ZIP (no delivery zone required).
    if (!recipient.firstName) errors["recipient.firstName"] = "Vorname der Empfänger:in fehlt.";
    if (recipient.phone && !isPhone(recipient.phone)) errors["recipient.phone"] = "Telefonnummer ungültig.";
    if (!recipient.street && !recipient.addition) errors["recipient.street"] = "Straße oder Treffpunkt angeben.";
    if (recipient.kind === "meeting" && !recipient.addition) errors["recipient.addition"] = "Treffpunkt beschreiben (z. B. Haupteingang Burgtheater).";
    if (!recipient.city) errors["recipient.city"] = "Ort fehlt.";
  }

  const g = rec(input.greeting);
  const greetingMessage = str(g.message, L.greeting);
  const greeting = greetingMessage ? { message: greetingMessage, ...(str(g.senderName, L.name) ? { senderName: str(g.senderName, L.name) } : {}) } : undefined;

  const b = rec(input.billing);
  const billingUsed = ["company", "name", "street", "zip", "city", "vatId"].some((k) => str(b[k], 200));
  const billing = billingUsed
    ? {
        ...(str(b.company, L.company) ? { company: str(b.company, L.company) } : {}),
        ...(str(b.name, L.name) ? { name: str(b.name, L.name) } : {}),
        street: str(b.street, L.street), zip: str(b.zip, 12), city: str(b.city, L.city), country: str(b.country, 60) || "Österreich",
        ...(str(b.vatId, L.vatId) ? { vatId: str(b.vatId, L.vatId) } : {}),
      }
    : undefined;
  if (billing && (!billing.street || !billing.zip || !billing.city)) errors.billing = "Rechnungsadresse: Straße, PLZ und Ort angeben (oder alles leer lassen).";

  const validUntil = str(input.validUntil, 10);
  if (!isIsoDate(validUntil)) errors.validUntil = "Gültig bis fehlt.";

  const draft: OfferDraft = {
    locale, customer: { ...customer, ...(customer.phone ? {} : { phone: undefined }) }, items, extras, delivery, recipient,
    ...(greeting ? { greeting } : {}),
    ...(str(input.floristNote, L.note) ? { floristNote: str(input.floristNote, L.note) } : {}),
    ...(billing ? { billing } : {}),
    ...(str(input.internalNote, L.note) ? { internalNote: str(input.internalNote, L.note) } : {}),
    validUntil,
  };
  if (!errors.items && Object.keys(errors).length === 0 && offerTotals(draft).total < MIN_OFFER_TOTAL) errors.items = `Der Gesamtbetrag muss mindestens ${MIN_OFFER_TOTAL} € sein.`;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, offer: draft };
}
