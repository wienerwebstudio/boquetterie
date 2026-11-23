import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { CustomRequest, Offer, Order, Partner, SiteSettings } from "@/types";
import { BUDGET_LABELS, TOPIC_LABELS, type CustomRequestBudget, type CustomRequestTopic } from "@/lib/custom-requests-core";
import { offerPreviewOrder } from "@/lib/offers-core";
import type { Reminder } from "@/types/reminders";
import { getAllProducts, getExtras, getOccasions, getPartners, getSettings, readData, writeData } from "@/lib/cms";
import { getFloristBudgets } from "@/lib/florist-budget";
import * as templates from "@/lib/mail/templates";
import { floristReadyTime, getLocalNow, isSelfDeliveryDay } from "@/lib/delivery";
import type { MailBrand, MailMessages, RenderedMail } from "@/lib/mail/templates";
import { formatReminderDate } from "@/lib/mail/reminders";
import { DEFAULT_LOCALE, isLocale, LOCALE_INFO, type Locale } from "@/i18n/config";
import { loadMessages } from "@/i18n/messages";
import { localizePath } from "@/i18n/paths";

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
  /** Real attachments (PDFs, images). Resend: base64 `content`; SMTP: nodemailer attachments. */
  attachments?: MailAttachment[];
  /** Extra headers, e.g. List-Unsubscribe (outreach mails). */
  headers?: Record<string, string>;
}

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
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

/**
 * Test hook: with MAIL_CONSOLE_OUTBOX=true (and ONLY with the console provider, i.e. no
 * real mail is configured) the last 50 mails are also kept in the runtime document
 * `mail-outbox`, so the E2E suite can follow a login link. Never set it in production.
 */
async function writeConsoleOutbox(to: string[], subject: string, text: string, type?: string) {
  if (process.env.MAIL_CONSOLE_OUTBOX !== "true") return;
  try {
    const list = await readData<{ at: string; to: string[]; subject: string; text: string; type?: string }[]>("mail-outbox", []);
    await writeData("mail-outbox", [{ at: new Date().toISOString(), to, subject, text, type }, ...list].slice(0, 50));
  } catch (err) {
    console.warn("[mail] console outbox not written", err);
  }
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
      const extra = [
        ...(msg.attachments ?? []).map((a) => `[mail] Attachment: ${a.filename} (${a.content.length} bytes)`),
        ...Object.entries(msg.headers ?? {}).map(([k, v]) => `[mail] Header: ${k}: ${v}`),
      ];
      console.info(`[mail] (console provider) To: ${to.join(", ")}\n[mail] Subject: ${msg.subject}\n${extra.length ? `${extra.join("\n")}\n` : ""}${text.split("\n").map((l) => `[mail] ${l}`).join("\n")}`);
    }
    await writeConsoleOutbox(to, msg.subject, text, msg.tags?.type);
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
        ...(msg.attachments?.length ? { attachments: msg.attachments.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })) } : {}),
        ...(msg.headers ? { headers: msg.headers } : {}),
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
        attachments: msg.attachments?.length
          ? msg.attachments.map((a) => ({ filename: a.filename, content: a.content.toString("base64"), ...(a.contentType ? { content_type: a.contentType } : {}) }))
          : undefined,
        headers: msg.headers,
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

/** Status page of an order – in the shop language `locale` (German without prefix). */
export function orderTrackingUrl(order: Pick<Order, "id" | "token">, siteUrl: string, locale: Locale = DEFAULT_LOCALE) {
  return `${siteUrl.replace(/\/$/, "")}${localizePath(locale, `/bestellung/${encodeURIComponent(order.id)}?token=${encodeURIComponent(order.token)}`)}`;
}

/** Review page of an order – in the shop language `locale` (German without prefix). */
export function reviewUrl(order: Pick<Order, "id" | "token">, siteUrl: string, locale: Locale = DEFAULT_LOCALE) {
  return `${siteUrl.replace(/\/$/, "")}${localizePath(locale, `/bewertung?order=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.token)}`)}`;
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

/* ---------------- Language of customer mails ---------------- */

/** Language of a customer mail: the stored/requested locale when valid, else German. */
export async function customerMailLang(locale: unknown): Promise<{ locale: Locale; m: MailMessages }> {
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return { locale: l, m: (await loadMessages(l)).mail };
}

/**
 * Brand facts and settings for a customer mail: German as stored, other languages with the
 * translated content (claim, status names) where the admin has translated it.
 */
async function customerSettings(locale: Locale): Promise<SiteSettings> {
  if (locale === DEFAULT_LOCALE) return getSettings();
  const { getSettingsIn } = await import("@/lib/cms-localized");
  return getSettingsIn(locale).catch(() => getSettings());
}

/**
 * The order with product, size, colour, extra and window names in the customer's language
 * (content translations; untranslated names stay German). German: the order as stored.
 */
async function orderInLanguage(order: Order, locale: Locale): Promise<Order> {
  if (locale === DEFAULT_LOCALE) return order;
  try {
    const { getDeliveryZonesIn, getExtrasIn, getProductsIn } = await import("@/lib/cms-localized");
    const [products, extras, zones, germanProducts] = await Promise.all([getProductsIn(locale, true), getExtrasIn(locale, false), getDeliveryZonesIn(locale, false), getAllProducts(true)]);
    const window = zones.find((z) => z.id === order.delivery.zoneId)?.windows.find((w) => w.id === order.delivery.windowId);
    return {
      ...order,
      delivery: { ...order.delivery, ...(order.delivery.windowLabel && window ? { windowLabel: window.label } : {}) },
      lines: order.lines.map((l) => {
        const p = products.find((x) => x.id === l.productId);
        if (!p) return { ...l, extras: l.extras.map((e) => ({ ...e, name: extras.find((x) => x.id === e.extraId)?.name ?? e.name })) };
        const colorId = germanProducts.find((x) => x.id === l.productId)?.colorOptions?.find((c) => c.label === l.color)?.id;
        const color = colorId ? p.colorOptions?.find((c) => c.id === colorId)?.label : undefined;
        return {
          ...l,
          productName: p.name,
          sizeLabel: p.sizes.find((sz) => sz.id === l.sizeId)?.label ?? l.sizeLabel,
          ...(l.color && color ? { color } : {}),
          extras: l.extras.map((e) => ({ ...e, name: extras.find((x) => x.id === e.extraId)?.name ?? e.name })),
        };
      }),
    };
  } catch (err) {
    console.warn(`[mail] content in ${locale} unavailable – order names stay German`, err);
    return order;
  }
}

/** Day and month of a reminder: "12. März" in German, `Intl` in other languages. */
function reminderDateIn(locale: Locale, r: Pick<Reminder, "day" | "month">) {
  if (locale === DEFAULT_LOCALE) return formatReminderDate(r);
  // 2000 is a leap year, so 29 February exists.
  return new Intl.DateTimeFormat(LOCALE_INFO[locale].intl, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2000, r.month - 1, r.day, 12)));
}

/** Name of a reminder's occasion in the customer's language (own occasions keep the text they typed). */
async function occasionLabelIn(locale: Locale, reminder: Reminder): Promise<string> {
  if (locale === DEFAULT_LOCALE) return reminder.occasionLabel;
  try {
    const { getOccasionsIn } = await import("@/lib/cms-localized");
    const [german, local] = await Promise.all([getOccasions(), getOccasionsIn(locale)]);
    // Only when the stored label still is the occasion's German name (not a custom text).
    if (german.find((o) => o.slug === reminder.occasionSlug)?.name !== reminder.occasionLabel) return reminder.occasionLabel;
    return local.find((o) => o.slug === reminder.occasionSlug)?.name ?? reminder.occasionLabel;
  } catch {
    return reminder.occasionLabel;
  }
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
  // The customer's mail in the order's language; internal and partner mails stay German.
  const lang = await customerMailLang(order.locale);
  const [customerBrand, customerOrder] = kinds.includes("customer") && lang.locale !== DEFAULT_LOCALE
    ? await Promise.all([customerSettings(lang.locale).then(mailBrand), orderInLanguage(order, lang.locale)])
    : [brand, order];
  const recipients: Record<OrderMailKind, string[]> = {
    customer: [order.customer.email],
    internal: admin ? [admin] : [],
    partner: partner ? partnerMailAddresses(partner) : [],
  };
  const render: Record<OrderMailKind, () => RenderedMail> = {
    customer: () => templates.orderConfirmation({ order: customerOrder, brand: customerBrand, trackingUrl: orderTrackingUrl(order, brand.siteUrl, lang.locale), ...lang }),
    internal: () => templates.adminNewOrder({ order, brand, adminUrl: `${brand.siteUrl}/admin/bestellungen/${encodeURIComponent(order.id)}`, selfDelivery, readyBy: floristReadyTime(order.delivery, getLocalNow(settings.timezone)) }),
    partner: () => templates.floristOrder({ order, brand, selfDelivery, readyBy: floristReadyTime(order.delivery, getLocalNow(settings.timezone)), portalUrl: partnerPortalUrl(brand.siteUrl) }),
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
    portalUrl: partnerPortalUrl(brand.siteUrl),
  });
  return { to, result: await send(to.length === 1 ? to[0] : to, mail, "florist_order") };
}

/** Start page of the Partner-Portal (login / dashboard), see docs/PARTNER-PORTAL.md. */
export function partnerPortalUrl(siteUrl: string) {
  return `${siteUrl.replace(/\/$/, "")}/partner`;
}

/** Login link of the Partner-Portal. */
export async function sendPartnerPortalLoginMail(input: { to: string; url: string; partnerName: string; validMinutes: number; siteUrl: string }): Promise<MailResult> {
  const brand = { ...mailBrand(await getSettings()), siteUrl: input.siteUrl.replace(/\/$/, "") };
  const mail = templates.partnerPortalLogin({ url: input.url, brand, partnerName: input.partnerName, validMinutes: input.validMinutes });
  if (mailProvider() === "console" && process.env.NODE_ENV !== "test") {
    console.info(`\n[partner] ───────── Portal login link for ${input.to} ─────────\n[partner] ${input.url}\n`);
  }
  return send(input.to, mail, "partner_portal_login");
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
  const lang = await customerMailLang(order.locale);
  if (lang.locale === DEFAULT_LOCALE) {
    const brand = mailBrand(settings);
    const trackingUrl = orderTrackingUrl(order, brand.siteUrl);
    return send(order.customer.email, templates.orderStatusUpdate({ order, status, brand, trackingUrl }), `order_status_${status.key}`);
  }
  const [local, localOrder] = await Promise.all([customerSettings(lang.locale), orderInLanguage(order, lang.locale)]);
  const brand = mailBrand(local);
  const localStatus = local.orderStatuses.find((s) => s.key === status.key) ?? status;
  const trackingUrl = orderTrackingUrl(order, brand.siteUrl, lang.locale);
  return send(order.customer.email, templates.orderStatusUpdate({ order: localOrder, status: localStatus, brand, trackingUrl, ...lang }), `order_status_${status.key}`);
}

/** "Wie war der Strauß?" – sent once per delivered order by the review-requests cron. */
export async function sendReviewRequest(order: Order): Promise<MailResult> {
  const lang = await customerMailLang(order.locale);
  const [settings, localOrder] = await Promise.all([customerSettings(lang.locale), orderInLanguage(order, lang.locale)]);
  const brand = mailBrand(settings);
  return send(order.customer.email, templates.reviewRequest({ order: localOrder, brand, reviewUrl: reviewUrl(order, brand.siteUrl, lang.locale), ...lang }), "review_request");
}

/* ---------------- Individual offers ---------------- */

/**
 * The offer mail with the payment link, in the offer's language. `test` sends a copy
 * ("[Test]" subject) to the address the admin typed in – nothing is recorded on the offer.
 */
export async function sendOfferMail(offer: Offer, opts: { payUrl: string; to?: string; test?: boolean }): Promise<{ to: string; result: MailResult }> {
  const lang = await customerMailLang(offer.locale);
  const settings = await customerSettings(lang.locale);
  const brand = mailBrand(settings);
  const preview = await orderInLanguage(offerPreviewOrder(offer, { cardsEnabled: settings.greetingCard?.enabled === true }), lang.locale);
  const mail = templates.offerMail({ order: preview, brand, payUrl: opts.payUrl, validUntil: offer.validUntil, ...lang });
  const to = opts.to?.trim() || offer.customer.email;
  const result = await sendMail({
    to, subject: opts.test ? `[Test] ${mail.subject}` : mail.subject, html: mail.html, text: mail.text,
    tags: { type: opts.test ? "offer_test" : "offer" },
    // A test copy goes exactly where the admin typed it (like the sample order mails).
    bypassRedirect: Boolean(opts.test && opts.to),
  });
  return { to, result };
}

/** Rendered offer mail (admin preview). */
export async function renderOfferMail(offer: Offer, payUrl: string): Promise<RenderedMail> {
  const lang = await customerMailLang(offer.locale);
  const settings = await customerSettings(lang.locale);
  const preview = await orderInLanguage(offerPreviewOrder(offer, { cardsEnabled: settings.greetingCard?.enabled === true }), lang.locale);
  return templates.offerMail({ order: preview, brand: mailBrand(settings), payUrl, validUntil: offer.validUntil, ...lang });
}

/* ---------------- Occasion reminders ---------------- */

function reminderUrls(reminder: Reminder, siteUrl: string) {
  const q = `id=${encodeURIComponent(reminder.id)}&token=${encodeURIComponent(reminder.unsubscribeToken)}`;
  return { confirmUrl: `${siteUrl}/api/reminders/confirm?${q}`, unsubscribeUrl: `${siteUrl}/api/reminders/unsubscribe?${q}` };
}

/** Double-opt-in mail with the confirmation link. */
export async function sendReminderConfirmation(reminder: Reminder): Promise<MailResult> {
  const lang = await customerMailLang(reminder.locale);
  const [settings, occasionLabel] = await Promise.all([customerSettings(lang.locale), occasionLabelIn(lang.locale, reminder)]);
  const brand = mailBrand(settings);
  const { confirmUrl } = reminderUrls(reminder, brand.siteUrl);
  return send(
    reminder.email,
    templates.reminderConfirmation({ brand, confirmUrl, occasionLabel, personName: reminder.personName, dateLabel: reminderDateIn(lang.locale, reminder), leadDays: reminder.leadDays, ...lang }),
    "reminder_confirmation",
  );
}

/** The actual reminder, `daysUntil` days before the occasion. */
export async function sendOccasionReminder(reminder: Reminder, daysUntil: number): Promise<MailResult> {
  const lang = await customerMailLang(reminder.locale);
  const [settings, occasions, occasionLabel] = await Promise.all([customerSettings(lang.locale), getOccasions(), occasionLabelIn(lang.locale, reminder)]);
  const brand = mailBrand(settings);
  const occasion = occasions.find((o) => o.slug === reminder.occasionSlug);
  const { unsubscribeUrl } = reminderUrls(reminder, brand.siteUrl);
  return send(
    reminder.email,
    templates.occasionReminder({
      brand,
      occasionLabel,
      personName: reminder.personName,
      dateLabel: reminderDateIn(lang.locale, reminder),
      leadDays: daysUntil,
      occasionUrl: occasion ? `${brand.siteUrl}${localizePath(lang.locale, `/anlaesse/${occasion.slug}`)}` : undefined,
      shopUrl: `${brand.siteUrl}${localizePath(lang.locale, "/blumen")}`,
      unsubscribeUrl,
      ...lang,
    }),
    "occasion_reminder",
  );
}

/* ---------------- Auth ---------------- */

/** Magic-link login mail (used by the customer account feature). */
export async function sendMagicLink(input: { to: string; url: string; validMinutes?: number; locale?: Locale }): Promise<MailResult> {
  const settings = await getSettings();
  const brand = mailBrand(settings);
  const lang = await customerMailLang(input.locale);
  return send(input.to, templates.magicLink({ url: input.url, brandName: brand.name, siteUrl: brand.siteUrl, validMinutes: input.validMinutes, ...lang }), "magic_link");
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
export type TestMailKind = "all" | "partner" | "customer" | "internal" | "review";

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
    ["partner", "Partner-Auftrag", () => templates.floristOrder({ order, brand, portalUrl: partnerPortalUrl(brand.siteUrl) })],
    // Links in the sample lead to "Link nicht gültig" – the sample order is not stored.
    ["review", "Bewertungsanfrage", () => templates.reviewRequest({ order, brand, reviewUrl: reviewUrl(order, brand.siteUrl) })],
  ];
  const rendered: [string, RenderedMail][] = all.filter(([k]) => (kind === "all" ? k !== "review" : k === kind)).map(([, label, render]) => [label, render()]);
  const results = [];
  for (const [mail, m] of rendered) {
    results.push({ mail, result: await sendMail({ to, subject: `[Beispiel] ${m.subject}`, html: m.html, text: m.text, tags: { type: "test" }, bypassRedirect: Boolean(chosen) }) });
  }
  return { to, provider, results };
}

/* ---------------- Customer requests (/anfrage, see docs/INQUIRIES.md) ---------------- */

/**
 * Confirmation to the customer (in the request's language) and the team notification
 * (MAIL_ADMIN, German, photo attached). `photo` is the processed JPEG of the request.
 */
export async function sendCustomRequestMails(request: CustomRequest, opts: { siteUrl?: string; photo?: Buffer } = {}): Promise<{ customer: MailResult; admin: MailResult | null }> {
  const lang = await customerMailLang(request.locale);
  const [settings, messages] = await Promise.all([customerSettings(lang.locale), loadMessages(lang.locale)]);
  const brand = mailBrand(settings);
  const siteUrl = (opts.siteUrl ?? brand.siteUrl).replace(/\/$/, "");
  const t = messages.inquiry;
  let productName = request.product?.name;
  if (request.product && lang.locale !== DEFAULT_LOCALE) {
    try {
      const { getProductsIn } = await import("@/lib/cms-localized");
      productName = (await getProductsIn(lang.locale, true)).find((p) => p.slug === request.product?.slug)?.name ?? productName;
    } catch { /* German name */ }
  }
  const budgetKey = request.budget as CustomRequestBudget | undefined;
  const customer = await send(
    request.email,
    templates.customRequestConfirmation({
      brand: { ...brand, siteUrl },
      request,
      labels: {
        topics: request.topics.map((x) => t.topics[x as CustomRequestTopic] ?? x),
        product: productName,
        budget: budgetKey ? t.budgets[budgetKey] : undefined,
      },
      ...lang,
    }),
    "custom_request_confirmation",
  );

  const to = adminMailAddress();
  if (!to) return { customer, admin: null };
  const adminUrl = `${siteUrl}/admin/anfragen/${request.id}`;
  const mail = templates.adminCustomRequest({
    brand: { ...brand, siteUrl },
    request,
    labels: {
      topics: request.topics.map((x) => TOPIC_LABELS[x as CustomRequestTopic] ?? x),
      product: request.product?.name,
      budget: budgetKey ? BUDGET_LABELS[budgetKey] : undefined,
      language: lang.locale === DEFAULT_LOCALE ? "Deutsch" : `${LOCALE_INFO[lang.locale].name} (${lang.locale})`,
    },
    adminUrl,
    photoUrl: request.photo ? (request.photo.url.startsWith("/") ? `${siteUrl}${request.photo.url}` : request.photo.url) : undefined,
  });
  const admin = await sendMail({
    to, subject: mail.subject, html: mail.html, text: mail.text, replyTo: request.email,
    tags: { type: "custom_request" },
    ...(opts.photo ? { attachments: [{ filename: `${request.id}-foto.jpg`, content: opts.photo, contentType: "image/jpeg" }] } : {}),
  });
  return { customer, admin };
}
