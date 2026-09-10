import "server-only";
import type { Order } from "@/types";
import { getSettings } from "@/lib/cms";
import { formatDateLong, formatPrice } from "@/lib/format";

/**
 * Transactional e-mail.
 *
 * `sendMail()` is the single low-level entry point. Providers are selected by
 * environment:
 *   - RESEND_API_KEY set → Resend (HTTP API, no SDK needed)
 *   - otherwise          → console logger (development / previews)
 *
 * MAIL_FROM  – sender, e.g. "Boquetterie <hallo@boquetterie.at>" (must be a verified domain at the provider)
 * MAIL_REPLY_TO – optional reply-to address
 * MAIL_ADMIN – optional address that receives internal notifications (new orders, inquiries)
 */

export interface MailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

export interface MailResult {
  sent: boolean;
  provider: "resend" | "console";
  id?: string;
  error?: string;
}

export function mailProvider(): MailResult["provider"] {
  return process.env.RESEND_API_KEY ? "resend" : "console";
}

export function mailFrom() {
  return process.env.MAIL_FROM || "Boquetterie <no-reply@example.com>";
}

export function adminMailAddress() {
  return process.env.MAIL_ADMIN || null;
}

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendMail(msg: MailMessage): Promise<MailResult> {
  const text = msg.text ?? htmlToText(msg.html);
  const to = Array.isArray(msg.to) ? msg.to : [msg.to];
  const provider = mailProvider();

  if (provider === "console") {
    if (process.env.NODE_ENV !== "test") {
      console.info(`[mail] (console provider) To: ${to.join(", ")}\n[mail] Subject: ${msg.subject}\n${text.split("\n").map((l) => `[mail] ${l}`).join("\n")}`);
    }
    return { sent: false, provider };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: mailFrom(),
        to,
        subject: msg.subject,
        html: msg.html,
        text,
        reply_to: msg.replyTo ?? process.env.MAIL_REPLY_TO ?? undefined,
        tags: msg.tags ? Object.entries(msg.tags).map(([name, value]) => ({ name, value })) : undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[mail] resend error", res.status, body);
      return { sent: false, provider, error: `HTTP ${res.status}` };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { sent: true, provider, id: data.id };
  } catch (err) {
    console.error("[mail] resend failed", err);
    return { sent: false, provider, error: String(err) };
  }
}

export function orderTrackingUrl(order: Pick<Order, "id" | "token">, siteUrl: string) {
  return `${siteUrl.replace(/\/$/, "")}/bestellung/${encodeURIComponent(order.id)}?token=${encodeURIComponent(order.token)}`;
}

/** Order confirmation to the customer. Templates live in src/lib/mail/templates (see there for richer versions). */
export async function sendOrderConfirmation(order: Order): Promise<MailResult> {
  const settings = await getSettings();
  const url = orderTrackingUrl(order, settings.seo.siteUrl);
  const subject = `Deine Bestellung ${order.id} bei ${settings.brand.name}`;
  const html = `
    <p>Hallo ${escapeHtml(order.customer.firstName)},</p>
    <p>danke für deine Bestellung <strong>${order.id}</strong>.</p>
    <p>Lieferung am ${formatDateLong(order.delivery.date)}${order.delivery.windowLabel ? `, ${escapeHtml(order.delivery.windowLabel)}` : ""}<br/>
    an ${escapeHtml(`${order.recipient.firstName} ${order.recipient.lastName}`)}, ${escapeHtml(`${order.recipient.street} ${order.recipient.houseNumber}`)}, ${escapeHtml(`${order.recipient.zip} ${order.recipient.city}`)}.</p>
    <p>Gesamtbetrag: <strong>${formatPrice(order.totals.total)}</strong></p>
    <p><a href="${url}">Status deiner Bestellung ansehen</a></p>
  `;
  return sendMail({ to: order.customer.email, subject, html, tags: { type: "order_confirmation" } });
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
