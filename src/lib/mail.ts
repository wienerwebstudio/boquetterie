import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { Order, SiteSettings } from "@/types";
import type { Reminder } from "@/types/reminders";
import { getOccasions, getSettings } from "@/lib/cms";
import * as templates from "@/lib/mail/templates";
import type { MailBrand, RenderedMail } from "@/lib/mail/templates";
import { formatReminderDate } from "@/lib/mail/reminders";

/**
 * Transactional e-mail.
 *
 * `sendMail()` is the single low-level entry point. Providers are selected by
 * environment:
 *   - RESEND_API_KEY set → Resend (HTTP API, no SDK needed)
 *   - SMTP_HOST set      → SMTP via nodemailer, e.g. the shop's own mailbox
 *                          (SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE – see docs/MAIL.md)
 *   - otherwise          → console logger (development / previews)
 *
 * MAIL_FROM  – sender, e.g. "Blumora <office@blumora.at>" (verified domain at Resend, or the SMTP mailbox itself)
 * MAIL_REPLY_TO – optional reply-to address
 * MAIL_ADMIN – optional address that receives internal notifications (new orders, inquiries)
 * MAIL_FLORIST – optional, comma-separated: the partner florist's order slip (no customer contact data)
 *
 * Templates (pure, testable) live in `src/lib/mail/templates.ts`; this file wires
 * them to settings and the provider. All `send*` helpers resolve to a MailResult
 * and never throw – callers may still `.catch()` defensively.
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
  provider: "resend" | "smtp" | "console";
  id?: string;
  error?: string;
}

export function mailProvider(): MailResult["provider"] {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST) return "smtp";
  return "console";
}

export function mailFrom() {
  return process.env.MAIL_FROM || "Blumora <no-reply@example.com>";
}

export function adminMailAddress() {
  return process.env.MAIL_ADMIN || null;
}

/** MAIL_FLORIST as a list ("a@x.at, b@y.at"); empty when unset. */
export function floristMailAddresses(): string[] {
  return (process.env.MAIL_FLORIST ?? "")
    .split(/[,;\s]+/)
    .map((a) => a.trim())
    .filter((a) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a));
}

/** One SMTP connection setup per process. Port 465 = implicit TLS, otherwise STARTTLS. */
const g = globalThis as unknown as { __blumoraSmtp?: Transporter };
function smtpTransport(): Transporter {
  if (!g.__blumoraSmtp) {
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
    g.__blumoraSmtp = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
      // Serverless functions are short-lived: fail fast instead of hanging the function.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return g.__blumoraSmtp;
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

  if (provider === "smtp") {
    try {
      const info = await smtpTransport().sendMail({
        from: mailFrom(),
        to,
        subject: msg.subject,
        html: msg.html,
        text,
        replyTo: msg.replyTo ?? process.env.MAIL_REPLY_TO ?? undefined,
      });
      return { sent: true, provider, id: info.messageId };
    } catch (err) {
      console.error("[mail] smtp failed", err);
      return { sent: false, provider, error: String(err) };
    }
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

/* ---------------- URLs & brand context ---------------- */

export function siteUrlOf(settings: Pick<SiteSettings, "seo">) {
  return settings.seo.siteUrl.replace(/\/$/, "");
}

export function orderTrackingUrl(order: Pick<Order, "id" | "token">, siteUrl: string) {
  return `${siteUrl.replace(/\/$/, "")}/bestellung/${encodeURIComponent(order.id)}?token=${encodeURIComponent(order.token)}`;
}

export function reviewUrl(order: Pick<Order, "id" | "token">, siteUrl: string) {
  return `${siteUrl.replace(/\/$/, "")}/bewertung?order=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.token)}`;
}

/** Brand facts for the templates. Placeholder values ("[…]") from settings are never sent. */
export function mailBrand(settings: SiteSettings): MailBrand {
  const real = (v: string) => (v && !v.trim().startsWith("[") ? v : undefined);
  return {
    name: settings.brand.name,
    siteUrl: siteUrlOf(settings),
    claim: real(settings.brand.claim),
    email: real(settings.brand.email),
    logoUrl: `${siteUrlOf(settings)}/images/brand/logo-horizontal.png`,
  };
}

function send(to: string | string[], mail: RenderedMail, type: string): Promise<MailResult> {
  return sendMail({ to, subject: mail.subject, html: mail.html, text: mail.text, tags: { type } });
}

/* ---------------- Order mails ---------------- */

/**
 * Mails for a paid order: confirmation to the customer, internal notification to
 * MAIL_ADMIN and the order slip to the florist (MAIL_FLORIST), each only if set.
 * All three are awaited together, so a serverless function does not end while one
 * is still in flight; one failing never stops the others. Resolves with the
 * customer mail's result.
 */
export async function sendOrderConfirmation(order: Order): Promise<MailResult> {
  const settings = await getSettings();
  const brand = mailBrand(settings);
  const trackingUrl = orderTrackingUrl(order, brand.siteUrl);
  const admin = adminMailAddress();
  const florist = floristMailAddresses();

  const [customer, ...internal] = await Promise.allSettled([
    send(order.customer.email, templates.orderConfirmation({ order, brand, trackingUrl }), "order_confirmation"),
    admin ? send(admin, templates.adminNewOrder({ order, brand, adminUrl: `${brand.siteUrl}/admin/bestellungen/${encodeURIComponent(order.id)}` }), "admin_new_order") : null,
    florist.length ? send(florist, templates.floristOrder({ order, brand }), "florist_order") : null,
  ]);
  for (const r of internal) if (r.status === "rejected") console.error("[mail] internal order mail failed", r.reason);
  if (customer.status === "rejected") return { sent: false, provider: mailProvider(), error: String(customer.reason) };
  return customer.value;
}

/**
 * Status update to the customer. Only sent for statuses flagged `customerVisible`
 * in settings; resolves with `sent:false` otherwise.
 */
export async function sendOrderStatusUpdate(order: Order): Promise<MailResult> {
  const settings = await getSettings();
  const status = settings.orderStatuses.find((s) => s.key === order.status);
  if (!status || !status.customerVisible) return { sent: false, provider: mailProvider(), error: "status not customer visible" };
  const brand = mailBrand(settings);
  const trackingUrl = orderTrackingUrl(order, brand.siteUrl);
  return send(order.customer.email, templates.orderStatusUpdate({ order, status, brand, trackingUrl }), `order_status_${status.key}`);
}

/** "Wie war der Strauß?" – sent once per delivered order by the review-requests cron. */
export async function sendReviewRequest(order: Order): Promise<MailResult> {
  const settings = await getSettings();
  const brand = mailBrand(settings);
  return send(order.customer.email, templates.reviewRequest({ order, brand, reviewUrl: reviewUrl(order, brand.siteUrl) }), "review_request");
}

/* ---------------- Occasion reminders ---------------- */

function reminderUrls(reminder: Reminder, siteUrl: string) {
  const q = `id=${encodeURIComponent(reminder.id)}&token=${encodeURIComponent(reminder.unsubscribeToken)}`;
  return { confirmUrl: `${siteUrl}/api/reminders/confirm?${q}`, unsubscribeUrl: `${siteUrl}/api/reminders/unsubscribe?${q}` };
}

/** Double-opt-in mail with the confirmation link. */
export async function sendReminderConfirmation(reminder: Reminder): Promise<MailResult> {
  const settings = await getSettings();
  const brand = mailBrand(settings);
  const { confirmUrl } = reminderUrls(reminder, brand.siteUrl);
  return send(
    reminder.email,
    templates.reminderConfirmation({ brand, confirmUrl, occasionLabel: reminder.occasionLabel, personName: reminder.personName, dateLabel: formatReminderDate(reminder), leadDays: reminder.leadDays }),
    "reminder_confirmation",
  );
}

/** The actual reminder, `daysUntil` days before the occasion. */
export async function sendOccasionReminder(reminder: Reminder, daysUntil: number): Promise<MailResult> {
  const [settings, occasions] = await Promise.all([getSettings(), getOccasions()]);
  const brand = mailBrand(settings);
  const occasion = occasions.find((o) => o.slug === reminder.occasionSlug);
  const { unsubscribeUrl } = reminderUrls(reminder, brand.siteUrl);
  return send(
    reminder.email,
    templates.occasionReminder({
      brand,
      occasionLabel: reminder.occasionLabel,
      personName: reminder.personName,
      dateLabel: formatReminderDate(reminder),
      leadDays: daysUntil,
      occasionUrl: occasion ? `${brand.siteUrl}/anlaesse/${occasion.slug}` : undefined,
      shopUrl: `${brand.siteUrl}/blumen`,
      unsubscribeUrl,
    }),
    "occasion_reminder",
  );
}

/* ---------------- Auth ---------------- */

/** Magic-link login mail (used by the customer account feature). */
export async function sendMagicLink(input: { to: string; url: string; validMinutes?: number }): Promise<MailResult> {
  const settings = await getSettings();
  const brand = mailBrand(settings);
  return send(input.to, templates.magicLink({ url: input.url, brandName: brand.name, siteUrl: brand.siteUrl, validMinutes: input.validMinutes }), "magic_link");
}

export { escapeHtml } from "@/lib/mail/templates";
