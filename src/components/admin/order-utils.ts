import type { Order, OrderStatus, SiteSettings } from "@/types";

/** Chip colours per status: tinted background + text (>= 4.5:1) + a solid dot. */
export const STATUS_TONES: Record<OrderStatus, string> = {
  received: "bg-[#e4f1fd] text-[#175c9c] [--dot:#2f80d0]",
  paid: "bg-[#e2f6ec] text-[#0a6644] [--dot:#0f9466]",
  preparing: "bg-[#fdf2db] text-[#8a5000] [--dot:#c27400]",
  arranging: "bg-[#efe9fe] text-[#5b36c2] [--dot:#7c4ff0]",
  ready: "bg-[#dff5f4] text-[#0c6467] [--dot:#0f8f8f]",
  in_transit: "bg-[#ffeae4] text-[#b03a1c] [--dot:#e0532f]",
  delivered: "bg-[#1f6a4a] text-white [--dot:#7ee2b8]",
  undeliverable: "bg-[#fdecea] text-[#b42318] [--dot:#c0392b]",
  cancelled: "bg-[#eef0f2] text-[#4a5160] [--dot:#9aa1ad]",
};

export function statusLabel(settings: Pick<SiteSettings, "orderStatuses">, status: OrderStatus) {
  return settings.orderStatuses.find((s) => s.key === status)?.label ?? status;
}

/**
 * An order that still needs work: paid and not in a final status. Unpaid orders
 * (payment cancelled or never finished) are not open – nothing may be bound for them.
 */
export function isOpenOrder(order: Order, settings: Pick<SiteSettings, "orderStatuses">) {
  if (order.payment.status !== "paid") return false;
  const def = settings.orderStatuses.find((s) => s.key === order.status);
  return def ? !def.terminal : true;
}

/** Created, but the payment never went through (cancelled in the payment step, failed or still pending). */
export function isUnpaidOrder(order: Order) {
  return order.payment.status === "pending" || order.payment.status === "failed";
}

/** "YYYY-MM-DD" of an ISO datetime in the shop timezone. */
export function localDateOf(iso: string, timezone = "Europe/Vienna") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function customerName(order: Order) {
  return `${order.customer.firstName} ${order.customer.lastName}`.trim();
}
export function recipientName(order: Order) {
  return `${order.recipient.firstName} ${order.recipient.lastName}`.trim();
}

export const PAYMENT_LABELS: Record<Order["payment"]["method"], string> = {
  apple_pay: "Apple Pay", google_pay: "Google Pay", card: "Kreditkarte", paypal: "PayPal", klarna: "Klarna", eps: "EPS",
};
export const PAYMENT_STATUS_LABELS: Record<Order["payment"]["status"], string> = {
  pending: "Ausstehend", paid: "Bezahlt", failed: "Fehlgeschlagen", refunded: "Erstattet",
};

/** German names of the shop languages – for "bestellt auf …" in the admin. */
/** Shop languages in German, for admin labels. */
export const LANGUAGE_NAMES_DE: Record<string, string> = {
  de: "Deutsch", en: "Englisch", tr: "Türkisch", bks: "Bosnisch/Kroatisch/Serbisch", uk: "Ukrainisch", ru: "Russisch",
  pl: "Polnisch", ro: "Rumänisch", hu: "Ungarisch", ar: "Arabisch", bg: "Bulgarisch", fa: "Persisch", sk: "Slowakisch",
  it: "Italienisch", fr: "Französisch", es: "Spanisch", ce: "Tschetschenisch",
};

/** Shop language of an order in German ("Türkisch"); `null` for German orders (no `locale`). */
export function orderLanguage(order: Pick<Order, "locale">): string | null {
  if (!order.locale || order.locale === "de") return null;
  return LANGUAGE_NAMES_DE[order.locale] ?? order.locale;
}
