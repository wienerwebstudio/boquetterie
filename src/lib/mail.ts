import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { Order, Partner, SiteSettings } from "@/types";
import type { Reminder } from "@/types/reminders";
import { getAllProducts, getExtras, getOccasions, getPartners, getSettings } from "@/lib/cms";
import { getFloristBudgets } from "@/lib/florist-budget";
import * as templates from "@/lib/mail/templates";
import { floristReadyTime, getLocalNow, isSelfDeliveryDay } from "@/lib/delivery";
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
 * MAIL_FLORIST – optional, comma-separated: fallback addresses for a partner florist (admin → Partner)
 *   that has no address of its own and "useEnvMail" set. Order slips only go out when an order is
 *   assigned to a partner in the admin – never automatically on payment.
 * MAIL_REDIRECT_TO – test switch: when set, EVERY mail goes only to this address; the subject
 *   names the original recipients. Remove it to go live.
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
  /**
   * Ignore MAIL_REDIRECT_TO for this one message. Only for the admin's "[Beispiel]" test
   * mails to an address the admin typed in – they contain no real customer data.
   */
  bypassRedirect?: boolean;
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

/** Addresses of a partner florist: its own, or MAIL_FLORIST while it has none and `useEnvMail` is set. */
export function partnerMailAddresses(partner: Pick<Partner, "emails" | "useEnvMail">): string[] {
  const own = (partner.emails ?? []).map((a) => a.trim()).filter((a) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a));
  if (own.length) return own;
  return partner.useEnvMail ? floristMailAddresses() : [];
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

/** Applies MAIL_REDIRECT_TO: one fixed test recipient, the real ones named in the subject. */
export function applyRedirect(to: string[], subject: string): { to: string[]; subject: string } {
  const redirect = process.env.MAIL_REDIRECT_TO?.trim();
  if (!redirect) return { to, subject };
  return { to: [redirect], subject: `[TEST an ${to.join(", ")}] ${subject}` };
}

export async function sendMail(msg: MailMessage): Promise<MailResult> {
  const text = msg.text ?? htmlToText(msg.html);
  const recipients = Array.isArray(msg.to) ? msg.to : [msg.to];
  const routed = msg.bypassRedirect ? { to: recipients, subject: msg.subject } : applyRedirect(recipients, msg.subject);
  const to = routed.to;
  msg = { ...msg, subject: routed.subject };
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

/** The mails of a paid order. "partner" only goes to the partner the order is assigned to. */
export type OrderMailKind = "customer" | "internal" | "partner";
export const ORDER_MAIL_LABELS: Record<OrderMailKind, string> = { customer: "Kundenbestellung", internal: "Bestelleingang", partner: "Partner-Auftrag" };

/** The partner record an order is assigned to (current data from the admin), or null. */
export async function assignedPartner(order: Order): Promise<Partner | null> {
  if (!order.partner) return null;
  const partners = await getPartners().catch(() => [] as Partner[]);
  return partners.find((p) => p.id === order.partner?.id) ?? null;
}

/**
 * Sends the chosen order mails for real: confirmation to the customer, internal
 * notification to MAIL_ADMIN and the order slip to the ASSIGNED partner florist.
 * A mail without a recipient (e.g. no partner assigned yet) is skipped (result `null`).
 * All are awaited together, one failing never stops the others.
 */
export async function sendOrderMails(order: Order, kinds: readonly OrderMailKind[] = ["customer", "internal"]): Promise<{ kind: OrderMailKind; to: string[]; result: MailResult | null }[]> {
  const settings = await getSettings();
  const brand = mailBrand(settings);
  const selfDelivery = isSelfDeliveryDay(settings, order.delivery.date);
  const admin = adminMailAddress();
  const partner = kinds.includes("partner") ? await assignedPartner(order) : null;
  const recipients: Record<OrderMailKind, string[]> = {
    customer: [order.customer.email],
    internal: admin ? [admin] : [],
    partner: partner ? partnerMailAddresses(partner) : [],
  };
  const render: Record<OrderMailKind, () => RenderedMail> = {
    customer: () => templates.orderConfirmation({ order, brand, trackingUrl: orderTrackingUrl(order, brand.siteUrl) }),
    internal: () => templates.adminNewOrder({ order, brand, adminUrl: `${brand.siteUrl}/admin/bestellungen/${encodeURIComponent(order.id)}`, selfDelivery, readyBy: floristReadyTime(order.delivery, getLocalNow(settings.timezone)) }),
    partner: () => templates.floristOrder({ order, brand, selfDelivery, readyBy: floristReadyTime(order.delivery, getLocalNow(settings.timezone)) }),
  };
  const types: Record<OrderMailKind, string> = { customer: "order_confirmation", internal: "admin_new_order", partner: "florist_order" };
  const settled = await Promise.allSettled(
    kinds.map((kind) => (recipients[kind].length ? send(recipients[kind].length === 1 ? recipients[kind][0] : recipients[kind], render[kind](), types[kind]) : Promise.resolve(null))),
  );
  return kinds.map((kind, i) => {
    const r = settled[i];
    if (r.status === "rejected") {
      console.error(`[mail] ${kind} order mail failed`, r.reason);
      return { kind, to: recipients[kind], result: { sent: false, provider: mailProvider(), error: String(r.reason) } };
    }
    return { kind, to: recipients[kind], result: r.value };
  });
}

/**
 * Mails for a freshly paid order: customer confirmation and the internal notification.
 * The partner florist gets nothing here – the order is assigned to a partner in the
 * admin first. Resolves with the customer mail's result.
 */
export async function sendOrderConfirmation(order: Order): Promise<MailResult> {
  const results = await sendOrderMails(order, ["customer", "internal"]);
  return results.find((r) => r.kind === "customer")?.result ?? { sent: false, provider: mailProvider(), error: "no customer mail" };
}

/** Order slip to one partner florist (assignment in the admin). */
export async function sendPartnerOrder(order: Order, partner: Partner, confirmToken?: string, reminder?: number): Promise<{ to: string[]; result: MailResult | null }> {
  const to = partnerMailAddresses(partner);
  if (!to.length) return { to, result: null };
  const settings = await getSettings();
  const brand = mailBrand(settings);
  const mail = templates.floristOrder({
    order, brand, selfDelivery: isSelfDeliveryDay(settings, order.delivery.date),
    readyBy: floristReadyTime(order.delivery, getLocalNow(settings.timezone)),
    confirmUrl: confirmToken ? `${brand.siteUrl}/partner-auftrag?order=${encodeURIComponent(order.id)}&token=${confirmToken}` : undefined,
    reminder,
  });
  return { to, result: await send(to.length === 1 ? to[0] : to, mail, "florist_order") };
}

/** Tells the team (MAIL_ADMIN) that a partner confirmed an order slip. Never throws. */
export async function sendPartnerConfirmedNotice(order: Order, partnerName: string): Promise<MailResult | null> {
  const admin = adminMailAddress();
  if (!admin) return null;
  try {
    const brand = mailBrand(await getSettings());
    return await send(admin, templates.partnerConfirmed({ order, brand, partnerName, adminUrl: `${brand.siteUrl}/admin/bestellungen/${encodeURIComponent(order.id)}` }), "partner_confirmed");
  } catch (err) {
    console.error("[mail] partner confirmation notice failed", err);
    return null;
  }
}

/** Tells the team (MAIL_ADMIN) that a customer got stuck in the payment form. Never throws. */
export async function sendPaymentProblemNotice(order: Order, note: string): Promise<MailResult | null> {
  const admin = adminMailAddress();
  if (!admin) return null;
  try {
    const brand = mailBrand(await getSettings());
    const adminUrl = `${brand.siteUrl}/admin/bestellungen/${encodeURIComponent(order.id)}`;
    return await send(admin, templates.paymentProblemNotice({ order, brand, note, adminUrl }), "payment_problem");
  } catch (err) {
    console.error("[mail] payment problem notice failed", err);
    return null;
  }
}

/** Tells the team (MAIL_ADMIN) that a partner has not confirmed yet. Never throws. */
export async function sendPartnerReminderNotice(order: Order, partner: Partner, n: number, last: boolean, partnerMailSent: boolean): Promise<MailResult | null> {
  const admin = adminMailAddress();
  if (!admin) return null;
  try {
    const brand = mailBrand(await getSettings());
    const adminUrl = `${brand.siteUrl}/admin/bestellungen/${encodeURIComponent(order.id)}`;
    return await send(admin, templates.partnerReminderNotice({ order, brand, partnerName: partner.name, phone: partner.phone, n, last, partnerMailSent, adminUrl }), "partner_reminder");
  } catch (err) {
    console.error("[mail] partner reminder notice failed", err);
    return null;
  }
}

/** Cancellation to a partner florist that already got the order slip. */
export async function sendPartnerCancellation(order: Order, partner: Partner, reason: "cancelled" | "reassigned"): Promise<{ to: string[]; result: MailResult | null }> {
  const to = partnerMailAddresses(partner);
  if (!to.length) return { to, result: null };
  const settings = await getSettings();
  const mail = templates.floristCancellation({ order, brand: mailBrand(settings), reason });
  return { to, result: await send(to.length === 1 ? to[0] : to, mail, "florist_cancellation") };
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

/* ---------------- Test mails (admin) ---------------- */

/** A clearly fictitious paid order for previewing the order mails. */
export interface SampleOrderInput {
  product?: { id: string; name: string; sizeId: string; sizeLabel: string; stems?: number; price: number; image?: string; floristBudget?: number };
  extra?: { id: string; name: string; price: number; image?: string; floristBudget?: number } | null;
  /** Adds a greeting card – only when cards are on offer. */
  withCard?: boolean;
}

export function sampleOrder(input: SampleOrderInput = {}): Order {
  const p = input.product ?? { id: "beispiel", name: "Red Rose Bouquet", sizeId: "m", sizeLabel: "Mittel", price: 65.9 };
  const x = input.extra === undefined ? { id: "beispiel", name: "Teddy", price: 19.9 } : input.extra;
  const date = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  const extrasTotal = x ? x.price : 0;
  return {
    id: "BQ-BEISPIEL", token: "beispiel", createdAt: new Date().toISOString(), status: "paid", history: [],
    recipient: { firstName: "Anna", lastName: "Beispiel", company: "", street: "Neubaugasse", houseNumber: "12", addition: "Top 4", zip: "1070", city: "Wien", country: "AT", phone: "+43 660 0000000" },
    delivery: { date, windowId: "am", windowLabel: "9–12 Uhr", windowFrom: "09:00", windowTo: "12:00", zoneId: "beispiel", zoneName: "Beispielzone", fee: 0, note: "Beispielbestellung – nicht ausliefern" },
    customer: { firstName: "Max", lastName: "Beispiel", email: "kunde@beispiel.invalid", phone: "+43 660 0000000" },
    lines: [{
      productId: p.id, productName: p.name, sizeId: p.sizeId as Order["lines"][number]["sizeId"], sizeLabel: p.sizeLabel, ...(p.stems ? { stems: p.stems } : {}), quantity: 1, unitPrice: p.price, image: p.image ?? "",
      floristBudget: p.floristBudget,
      extras: x ? [{ extraId: x.id, name: x.name, quantity: 1, unitPrice: x.price, image: x.image, floristBudget: x.floristBudget }] : [],
      ...(input.withCard ? { message: "Alles Liebe – das ist nur eine Test-Mail.", senderName: "Blumora" } : {}),
    }],
    totals: { subtotal: p.price, extras: extrasTotal, delivery: 0, discount: 0, total: Math.round((p.price + extrasTotal) * 100) / 100 },
    payment: { method: "card", status: "paid", provider: "beispiel" },
  };
}

/** Sample order from the live catalogue (Red Rose Bouquet S + Teddy) with the stored florist budgets. */
async function liveSampleOrder(settings: SiteSettings): Promise<Order> {
  try {
    const [products, extras, budgets] = await Promise.all([getAllProducts(), getExtras(), getFloristBudgets()]);
    const product = products.find((pr) => pr.id === "p-red-rose-bouquet") ?? products.find((pr) => pr.active);
    const size = product?.sizes.find((sz) => sz.id === "s") ?? product?.sizes[0];
    const extra = extras.find((e) => e.id === "x-teddy" && e.active) ?? null;
    if (!product || !size) return sampleOrder({ withCard: settings.greetingCard?.enabled === true });
    return sampleOrder({
      product: {
        id: product.id, name: product.name, sizeId: size.id, sizeLabel: size.label, stems: size.stems, price: size.price,
        image: size.image || (product.images.find((im) => im.kind === "front") ?? product.images[0])?.src,
        floristBudget: budgets.products[product.id]?.[size.id],
      },
      extra: extra ? { id: extra.id, name: extra.name, price: extra.price, image: extra.image, floristBudget: budgets.extras[extra.id] } : null,
      withCard: settings.greetingCard?.enabled === true,
    });
  } catch (err) {
    console.warn("[mail] sample order from the catalogue failed – using the built-in example", err);
    return sampleOrder({ withCard: settings.greetingCard?.enabled === true });
  }
}

/**
 * Sends the three order mails for `sampleOrder()` to ONE address – the one the admin
 * entered, else the test recipient (MAIL_REDIRECT_TO), else MAIL_ADMIN – never to
 * customers or the florist automatically. Subjects start with "[Beispiel]".
 */
/** Which sample mails to send: all three, or only the partner's order slip, the customer's confirmation or the internal "new order" mail. */
export type TestMailKind = "all" | "partner" | "customer" | "internal";

export async function sendTestOrderMails(recipient?: string, kind: TestMailKind = "all"): Promise<{ to: string | null; provider: MailResult["provider"]; results: { mail: string; result: MailResult }[] }> {
  const chosen = recipient?.trim() || undefined;
  const to = chosen || process.env.MAIL_REDIRECT_TO?.trim() || adminMailAddress();
  const provider = mailProvider();
  if (!to) return { to: null, provider, results: [] };
  const settings = await getSettings();
  const brand = mailBrand(settings);
  const order = await liveSampleOrder(settings);
  const all: [TestMailKind, string, () => RenderedMail][] = [
    ["customer", "Kundenbestellung", () => templates.orderConfirmation({ order, brand, trackingUrl: `${brand.siteUrl}/bestellung-verfolgen` })],
    ["internal", "Bestelleingang", () => templates.adminNewOrder({ order, brand, adminUrl: `${brand.siteUrl}/admin/bestellungen` })],
    ["partner", "Partner-Auftrag", () => templates.floristOrder({ order, brand })],
  ];
  const rendered: [string, RenderedMail][] = all.filter(([k]) => kind === "all" || k === kind).map(([, label, render]) => [label, render()]);
  const results = [];
  for (const [mail, m] of rendered) {
    results.push({ mail, result: await sendMail({ to, subject: `[Beispiel] ${m.subject}`, html: m.html, text: m.text, tags: { type: "test" }, bypassRedirect: Boolean(chosen) }) });
  }
  return { to, provider, results };
}
