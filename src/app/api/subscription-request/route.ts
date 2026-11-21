import { NextResponse } from "next/server";
import { getSettings, getSubscription } from "@/lib/cms";
import { deliverInquiry, inquiryUnavailable } from "@/lib/inquiries";
import { adminMailAddress, escapeHtml, sendMail } from "@/lib/mail";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Runtime document `subscription-requests` (data/subscription-requests.json, or Postgres when DATABASE_URL is set). */
const DATA_FILE = "subscription-requests";

interface SubscriptionRequest {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  plan: string;
  frequency: string;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * POST /api/subscription-request { name, email, plan, frequency, message?, website? (honeypot) }
 * Stores the request through the datastore (document `subscription-requests`, newest first)
 * and notifies MAIL_ADMIN (if set). A failing mail never fails the request.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "subscription-request", limit: 5, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  const [settings, config] = await Promise.all([getSettings(), getSubscription()]);
  if (!settings.subscriptionEnabled || !config.enabled) {
    return NextResponse.json({ ok: false, message: "Das Blumen-Abo ist derzeit nicht verfügbar." }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (typeof parsed !== "object" || parsed === null) throw new Error("invalid");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  }

  // Honeypot: bots fill the hidden field – pretend success without storing anything.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = str(body.name, 120);
  const email = str(body.email, 254);
  const plan = str(body.plan, 40);
  const frequency = str(body.frequency, 40);
  const message = str(body.message, 1000);

  if (name.length < 2) return NextResponse.json({ ok: false, message: "Bitte gib deinen Namen ein." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, message: "Bitte gib eine gültige E-Mail-Adresse ein." }, { status: 400 });
  const chosenPlan = config.plans.find((p) => p.id === plan);
  const chosenFrequency = config.frequencies.find((f) => f.id === frequency);
  if (!chosenPlan) return NextResponse.json({ ok: false, message: "Bitte wähle ein Abo." }, { status: 400 });
  if (!chosenFrequency) return NextResponse.json({ ok: false, message: "Bitte wähle einen Rhythmus." }, { status: 400 });

  const entry: SubscriptionRequest = {
    id: `SUB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    name, email, plan, frequency, message,
  };

  const { stored, mailed } = await deliverInquiry({
    scope: "subscription-request", dataFile: DATA_FILE, entry, prepend: true,
    notify: () => notifyAdmin(entry, chosenPlan.name, chosenFrequency.label),
  });
  if (!stored && !mailed) return inquiryUnavailable();

  return NextResponse.json({ ok: true, id: entry.id });
}

async function notifyAdmin(entry: SubscriptionRequest, planName: string, frequencyLabel: string): Promise<boolean> {
  const to = adminMailAddress();
  if (!to) return false;
  const row = (label: string, value: string) => `<tr><td style="padding:4px 12px 4px 0;color:#6b6862;vertical-align:top">${label}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`;
  const html = `
    <p>Neue Abo-Anfrage <strong>${entry.id}</strong></p>
    <table style="border-collapse:collapse;font-size:14px">
      ${row("Name", entry.name)}
      ${row("E-Mail", entry.email)}
      ${row("Abo", planName)}
      ${row("Rhythmus", frequencyLabel)}
    </table>
    ${entry.message ? `<p style="white-space:pre-wrap">${escapeHtml(entry.message)}</p>` : ""}
  `;
  const result = await sendMail({
    to,
    subject: `Abo-Anfrage von ${entry.name.replace(/\s+/g, " ")}`,
    html,
    replyTo: entry.email,
    tags: { type: "subscription_request" },
  });
  return result.sent;
}
