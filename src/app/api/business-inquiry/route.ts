import { NextResponse } from "next/server";
import { readData, writeData } from "@/lib/cms";
import { enforceRateLimit } from "@/lib/rate-limit";
import { adminMailAddress, escapeHtml, sendMail } from "@/lib/mail";
import { BUSINESS_NEEDS, validateBusinessInquiry, type BusinessInquiry } from "./schema";

export const dynamic = "force-dynamic";

const DATA_FILE = "business-inquiries";

/**
 * POST /api/business-inquiry
 * Body: { company, contact, email, phone?, location, need, message, consent, website? (honeypot) }
 * Stores the inquiry in data/business-inquiries.json and notifies MAIL_ADMIN (if set).
 * A failing mail never fails the request.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "business-inquiry", limit: 5, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
    if (!body || typeof body !== "object") throw new Error("invalid");
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  }

  // Honeypot: bots fill the hidden field – pretend success without storing anything.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const { data, errors } = validateBusinessInquiry(body);
  if (!data) return NextResponse.json({ ok: false, errors }, { status: 422 });

  const now = new Date().toISOString();
  const entry: BusinessInquiry = {
    id: `BI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    createdAt: now,
    consentAt: now,
    status: "new",
    ...data,
  };

  try {
    const stored = await readData<unknown>(DATA_FILE, []);
    const list = Array.isArray(stored) ? (stored as BusinessInquiry[]) : [];
    list.push(entry);
    await writeData(DATA_FILE, list);
  } catch (err) {
    console.error("[business-inquiry] could not store inquiry", err);
    return NextResponse.json({ ok: false, message: "Die Anfrage konnte nicht gespeichert werden. Bitte versuch es noch einmal." }, { status: 500 });
  }

  try {
    await notifyAdmin(entry);
  } catch (err) {
    console.error("[business-inquiry] admin notification failed", err);
  }

  return NextResponse.json({ ok: true, id: entry.id });
}

async function notifyAdmin(entry: BusinessInquiry) {
  const to = adminMailAddress();
  if (!to) return;
  const need = BUSINESS_NEEDS.find((n) => n.value === entry.need)?.label ?? entry.need;
  const row = (label: string, value: string) => `<tr><td style="padding:4px 12px 4px 0;color:#6b6862;vertical-align:top">${label}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`;
  const html = `
    <p>Neue Firmenkunden-Anfrage <strong>${entry.id}</strong></p>
    <table style="border-collapse:collapse;font-size:14px">
      ${row("Firma", entry.company)}
      ${row("Ansprechperson", entry.contact)}
      ${row("E-Mail", entry.email)}
      ${row("Telefon", entry.phone ?? "–")}
      ${row("Standort / PLZ", entry.location)}
      ${row("Bedarf", need)}
    </table>
    <p style="white-space:pre-wrap">${escapeHtml(entry.message)}</p>
  `;
  await sendMail({
    to,
    subject: `Firmenkunden-Anfrage von ${entry.company}`,
    html,
    replyTo: entry.email,
    tags: { type: "business_inquiry" },
  });
}
