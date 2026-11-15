import { NextResponse } from "next/server";
import { readData, writeData } from "@/lib/cms";
import { adminMailAddress, escapeHtml, sendMail } from "@/lib/mail";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Runtime document `contact-messages` (data/contact-messages.json, or Postgres when DATABASE_URL is set). */
const DATA_FILE = "contact-messages";

const SUBJECTS = ["Bestellung", "Lieferung", "Firmenkunden", "Sonstiges"] as const;
type Subject = (typeof SUBJECTS)[number];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface ContactMessage {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  subject: Subject;
  orderId?: string;
  message: string;
  read: boolean;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * POST /api/contact
 * Body: { name, email, subject, orderId?, message }
 * Stores the message through the datastore (document `contact-messages`) and notifies
 * MAIL_ADMIN (if set). A failing mail never fails the request.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "contact", limit: 5, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
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
  const email = str(body.email, 200);
  const subject = str(body.subject, 40);
  const orderId = str(body.orderId, 20);
  const message = str(body.message, 2000);

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Bitte gib deinen Namen an.";
  if (!EMAIL_RE.test(email)) errors.email = "Bitte gib eine gültige E-Mail-Adresse an.";
  if (!(SUBJECTS as readonly string[]).includes(subject)) errors.subject = "Bitte wähle ein Thema.";
  if (orderId && !/^[A-Za-z0-9-]{1,20}$/.test(orderId)) errors.orderId = "Bitte prüfe die Bestellnummer.";
  if (message.length < 10) errors.message = "Bitte beschreibe dein Anliegen (mindestens 10 Zeichen).";

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  const entry: ContactMessage = {
    id: `CM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    name,
    email,
    subject: subject as Subject,
    ...(orderId && { orderId: orderId.toUpperCase() }),
    message,
    read: false,
  };

  try {
    const stored = await readData<unknown>(DATA_FILE, []);
    const list = Array.isArray(stored) ? (stored as ContactMessage[]) : [];
    list.push(entry);
    await writeData(DATA_FILE, list);
  } catch (err) {
    console.error("[contact] could not store message", err);
    return NextResponse.json({ ok: false, message: "Die Nachricht konnte nicht gespeichert werden." }, { status: 500 });
  }

  try {
    await notifyAdmin(entry);
  } catch (err) {
    console.error("[contact] admin notification failed", err);
  }

  return NextResponse.json({ ok: true });
}

async function notifyAdmin(entry: ContactMessage) {
  const to = adminMailAddress();
  if (!to) return;
  const row = (label: string, value: string) => `<tr><td style="padding:4px 12px 4px 0;color:#6b6862;vertical-align:top">${label}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`;
  const html = `
    <p>Neue Kontaktanfrage <strong>${entry.id}</strong></p>
    <table style="border-collapse:collapse;font-size:14px">
      ${row("Name", entry.name)}
      ${row("E-Mail", entry.email)}
      ${row("Thema", entry.subject)}
      ${row("Bestellnummer", entry.orderId ?? "–")}
    </table>
    <p style="white-space:pre-wrap">${escapeHtml(entry.message)}</p>
  `;
  await sendMail({
    to,
    subject: `Kontaktanfrage (${entry.subject}) von ${entry.name.replace(/\s+/g, " ")}`,
    html,
    replyTo: entry.email,
    tags: { type: "contact_message" },
  });
}
