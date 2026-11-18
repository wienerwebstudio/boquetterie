import type { Order, OrderPartner } from "@/types";

/**
 * Until this moment, every paid order went to MAIL_FLORIST (Blumen Dody) automatically
 * on payment, without a record on the order. Such orders count as "sent to Blumen Dody",
 * so a cancellation still reaches them. Orders paid later are assigned in the admin.
 */
export const AUTO_PARTNER_UNTIL = "2026-11-18T09:14:00.000Z";
export const LEGACY_PARTNER = { id: "blumen-dody", name: "Blumen Dody" } as const;

/** The partner record of an order, including the implicit one of orders paid before the switch. */
export function effectivePartner(order: Order): OrderPartner | undefined {
  if (order.partner) return order.partner;
  if (order.payment.status !== "paid") return undefined;
  const paidAt = order.payment.paidAt ?? order.createdAt;
  if (!paidAt || paidAt >= AUTO_PARTNER_UNTIL) return undefined;
  return { ...LEGACY_PARTNER, assignedAt: paidAt, sentAt: paidAt };
}

/** The order with its effective partner filled in (see `effectivePartner`). */
export function withEffectivePartner(order: Order): Order {
  const partner = effectivePartner(order);
  return partner && !order.partner ? { ...order, partner } : order;
}
