import "server-only";
import type { Order } from "@/types";
import { getSettings } from "@/lib/cms";
import { formatDateLong, formatPrice } from "@/lib/format";

/**
 * Transactional e-mail stub.
 *
 * TODO(mail): no e-mail provider is connected yet. Wire up a transactional
 * service (e.g. Resend, Postmark, SES) here – keep the signature so callers
 * don't change. Until then the message is only logged in development so the
 * flow (order → confirmation link) can be inspected in the terminal.
 */

export function orderTrackingUrl(order: Pick<Order, "id" | "token">, siteUrl: string) {
  return `${siteUrl.replace(/\/$/, "")}/bestellung/${encodeURIComponent(order.id)}?token=${encodeURIComponent(order.token)}`;
}

export async function sendOrderConfirmation(order: Order): Promise<{ sent: boolean }> {
  const settings = await getSettings();
  const url = orderTrackingUrl(order, settings.seo.siteUrl);
  const subject = `Deine Bestellung ${order.id} bei ${settings.brand.name}`;
  const lines = [
    `Hallo ${order.customer.firstName},`,
    "",
    `danke für deine Bestellung ${order.id}.`,
    `Lieferung am ${formatDateLong(order.delivery.date)}${order.delivery.windowLabel ? `, ${order.delivery.windowLabel}` : ""}`,
    `an ${order.recipient.firstName} ${order.recipient.lastName}, ${order.recipient.street} ${order.recipient.houseNumber}, ${order.recipient.zip} ${order.recipient.city}.`,
    `Gesamtbetrag: ${formatPrice(order.totals.total)}`,
    "",
    `Status deiner Bestellung: ${url}`,
  ];

  if (process.env.NODE_ENV !== "production") {
    console.info(`[mail] (stub) To: ${order.customer.email}\n[mail] Subject: ${subject}\n${lines.map((l) => `[mail] ${l}`).join("\n")}`);
  }
  // TODO(mail): actually send `subject` + `lines` to order.customer.email.
  return { sent: false };
}
