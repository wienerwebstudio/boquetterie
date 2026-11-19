import { NextResponse } from "next/server";
import { getOrderById, getSettings } from "@/lib/cms";
import { deliverInquiry, inquiryUnavailable } from "@/lib/inquiries";
import { adminMailAddress, escapeHtml, mailBrand, sendMail } from "@/lib/mail";
import { withdrawalReceipt } from "@/lib/mail/templates";
import { enforceRateLimit } from "@/lib/rate-limit";
import { viennaDateTime } from "@/lib/format";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { formatDateTimeIn } from "@/i18n/format";
import { loadMessages } from "@/i18n/messages";
import { localizePath } from "@/i18n/paths";

export const dynamic = "force-dynamic";

/** Runtime document `withdrawals` (data/withdrawals.json, or Postgres when DATABASE_URL is set). */
const DATA_FILE = "withdrawals";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ORDER_RE = /^[A-Za-z0-9-]{4,20}$/;

interface WithdrawalEntry {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  orderId: string;
  items?: string;
  /** Whether an order with this number and e-mail exists – for the admin only, never told to the visitor. */
  orderMatched: boolean;
  confirmationSent: boolean;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * POST /api/withdrawals – the website's withdrawal function ("Vertrag widerrufen").
 * Body: { name, email, orderId, items?, locale?, website? (honeypot) } – `locale` is the
 * shop language; the acknowledgement mail goes out in it (German by default).
 *
 * Every complete declaration is accepted – whether the order exists is noted for the
 * admin, not checked against the visitor (no order enumeration, no extra hurdle).
 * The visitor gets an acknowledgement with date and time by e-mail; the admin a copy.
 * Delivered = stored or mailed to the admin; neither → 503 with the e-mail fallback.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "withdrawals", limit: 5, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (typeof parsed !== "object" || parsed === null) throw new Error("invalid");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  }
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true, receivedAt: viennaDateTime(new Date()) });

  const name = str(body.name, 120);
  const email = str(body.email, 200);
  const orderId = str(body.orderId, 20).toUpperCase();
  const items = str(body.items, 1000);

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Bitte gib deinen Namen an.";
  if (!EMAIL_RE.test(email)) errors.email = "Bitte gib eine gültige E-Mail-Adresse an.";
  if (!ORDER_RE.test(orderId)) errors.orderId = "Bitte gib die Bestellnummer an (z. B. BQ-7K2M9Q).";
  if (Object.keys(errors).length) return NextResponse.json({ ok: false, errors }, { status: 422 });

  const now = new Date();
  const receivedAt = viennaDateTime(now);
  const order = await getOrderById(orderId).catch(() => null);
  const orderMatched = Boolean(order && order.customer.email.trim().toLowerCase() === email.toLowerCase());
  const id = `WR-${now.getTime().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const settings = await getSettings();
  const brand = mailBrand(settings);
  const locale = isLocale(body.locale) ? body.locale : DEFAULT_LOCALE;
  const receipt = locale === DEFAULT_LOCALE
    ? withdrawalReceipt({ brand, id, receivedAt, name, orderId, items: items || undefined })
    : withdrawalReceipt({
        brand, id, name, orderId, items: items || undefined, locale, m: (await loadMessages(locale)).mail,
        receivedAt: formatDateTimeIn(locale, now.toISOString()), policyUrl: `${brand.siteUrl}${localizePath(locale, "/widerruf")}`,
      });
  const confirmation = await sendMail({ to: email, subject: receipt.subject, html: receipt.html, text: receipt.text, tags: { type: "withdrawal_receipt" } }).catch(() => null);

  const entry: WithdrawalEntry = {
    id, createdAt: now.toISOString(), name, email, orderId, ...(items && { items }), orderMatched, confirmationSent: Boolean(confirmation?.sent),
  };
  const { stored, mailed } = await deliverInquiry({ scope: "withdrawals", dataFile: DATA_FILE, entry, prepend: true, notify: () => notifyAdmin(entry, receivedAt) });
  if (!stored && !mailed) return inquiryUnavailable();

  return NextResponse.json({ ok: true, id, receivedAt, confirmationSent: entry.confirmationSent });
}

async function notifyAdmin(entry: WithdrawalEntry, receivedAt: string): Promise<boolean> {
  const to = adminMailAddress();
  if (!to) return false;
  const row = (label: string, value: string) => `<tr><td style="padding:4px 12px 4px 0;color:#6b6862;vertical-align:top">${label}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`;
  const html = `
    <p><strong>Widerruf über die Website</strong> (${escapeHtml(entry.id)}) – bitte prüfen und rückabwickeln.</p>
    <table style="border-collapse:collapse;font-size:14px">
      ${row("Eingegangen", receivedAt)}
      ${row("Name", entry.name)}
      ${row("E-Mail", entry.email)}
      ${row("Bestellnummer", entry.orderId)}
      ${row("Bestellung gefunden", entry.orderMatched ? "ja, E-Mail passt" : "nein – Nummer oder E-Mail passen nicht zusammen")}
      ${row("Widerrufen", entry.items ?? "alle widerrufbaren Waren")}
      ${row("Eingangsbestätigung an Kund:in", entry.confirmationSent ? "gesendet" : "NICHT gesendet – bitte selbst bestätigen")}
    </table>
  `;
  const result = await sendMail({ to, subject: `Widerruf zu Bestellung ${entry.orderId} von ${entry.name.replace(/\s+/g, " ")}`, html, replyTo: entry.email, tags: { type: "withdrawal" } });
  return result.sent;
}
