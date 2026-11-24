import type { Order } from "@/types";
import { getLocalNow } from "@/lib/delivery";

/**
 * Per-order figures shared by the analytics dashboard (/admin/analytics) and the server-side
 * analytics events. Pure – unit tested in tests/unit/analytics-dashboard.test.ts.
 */

const TZ = "Europe/Vienna";

/** "express" | "same_day" | "scheduled" | "none". */
export function deliveryType(order: Pick<Order, "delivery" | "createdAt">): "express" | "same_day" | "scheduled" | "none" {
  if (order.delivery.none) return "none";
  if (order.delivery.express) return "express";
  return order.delivery.date === getLocalNow(TZ, new Date(order.createdAt)).date ? "same_day" : "scheduled";
}

/** Delivered within its window (+15 min grace)? Late deliveries get a delay bucket. */
export function deliveryPunctuality(order: Pick<Order, "delivery">, deliveredAt: Date): { onTime: boolean; delayBucket?: string; lateMinutes?: number } {
  const { date, windowTo } = order.delivery;
  if (!windowTo) return { onTime: true };
  const now = getLocalNow(TZ, deliveredAt);
  const [h, m] = windowTo.split(":").map(Number);
  const late = now.date > date ? 24 * 60 : now.date < date ? -1 : now.minutes - (h * 60 + m);
  if (late <= 15) return { onTime: true };
  const bucket = late <= 30 ? "15-30m" : late <= 60 ? "30-60m" : late <= 120 ? "1-2h" : "2h+";
  return { onTime: false, delayBucket: bucket, lateMinutes: late };
}

type Line = Order["lines"][number];
/** What the customer pays for a line (incl. extras, before discount and delivery). */
export const lineRevenue = (l: Line) => l.unitPrice * l.quantity + l.extras.reduce((s, e) => s + e.unitPrice * e.quantity, 0);
/** Florist purchase price of a line (net, from the order slip); undefined when no budget was stored. */
export function lineCost(l: Line): number | undefined {
  if (typeof l.floristBudget !== "number") return undefined;
  return l.floristBudget * l.quantity + l.extras.reduce((s, e) => s + (e.floristBudget ?? 0) * e.quantity, 0);
}
/** Purchase price of the whole order; `complete` = every line had a budget. */
export function orderCost(order: Pick<Order, "lines">): { cost: number; complete: boolean } {
  let cost = 0;
  let complete = true;
  for (const l of order.lines) {
    const c = lineCost(l);
    if (c === undefined) complete = false;
    else cost += c;
  }
  return { cost, complete };
}

/** When the order was set to "Zugestellt" (last such history entry). */
export function deliveredAt(order: Pick<Order, "history">): Date | null {
  const h = [...order.history].reverse().find((x) => x.status === "delivered");
  return h ? new Date(h.at) : null;
}

/**
 * Why a payment did not go through, from the order history notes the checkout and the webhook
 * write ("card_error · card_declined · insufficient_funds", "Zahlung abgebrochen (nach 2 Std. …)").
 * A short code, never the text.
 */
export function paymentFailureCode(order: Pick<Order, "history" | "payment">): string | null {
  if (order.payment.status === "paid" || order.payment.status === "refunded") return null;
  const notes = order.history.map((h) => h.note ?? "").filter(Boolean).reverse();
  for (const n of notes) {
    const codes = n.match(/\b[a-z]+(?:_[a-z]+)+\b/g)?.filter((c) => !/^(invalid_request_error|card_error|api_error|validation_error)$/.test(c));
    if (codes?.length) return codes[codes.length - 1];
    if (/Kartenangaben unvollständig|incomplete/i.test(n)) return "incomplete_details";
  }
  if (notes.some((n) => /abgebrochen/i.test(n))) return "abandoned";
  return order.payment.status === "pending" ? "pending" : "unknown";
}
