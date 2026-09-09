import type { Order, OrderStatus, SiteSettings } from "@/types";

export const STATUS_TONES: Record<OrderStatus, string> = {
  received: "bg-ivory-200 text-ink",
  paid: "bg-[#e6f0ea] text-success",
  preparing: "bg-[#f8f0e4] text-warn",
  arranging: "bg-[#f8f0e4] text-warn",
  ready: "bg-[#e6f0ea] text-success",
  in_transit: "bg-forest text-ivory",
  delivered: "bg-[#e6f0ea] text-success",
  undeliverable: "bg-[#f8ecec] text-danger",
  cancelled: "bg-ivory-200 text-ink-muted",
};

export function statusLabel(settings: Pick<SiteSettings, "orderStatuses">, status: OrderStatus) {
  return settings.orderStatuses.find((s) => s.key === status)?.label ?? status;
}

export function isOpenOrder(order: Order, settings: Pick<SiteSettings, "orderStatuses">) {
  const def = settings.orderStatuses.find((s) => s.key === order.status);
  return def ? !def.terminal : true;
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
  pending: "Ausstehend", paid: "Bezahlt", failed: "Fehlgeschlagen",
};
