import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

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

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "contact-messages.json");

async function readMessages(): Promise<ContactMessage[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ContactMessage[]) : [];
  } catch {
    return [];
  }
}

async function appendMessage(msg: ContactMessage) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const list = await readMessages();
  list.push(msg);
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(list, null, 2) + "\n", "utf8");
  await fs.rename(tmp, FILE);
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * POST /api/contact
 * Body: { name, email, subject, orderId?, message }
 * Appends the message to data/contact-messages.json.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "contact", limit: 5, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
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
    await appendMessage(entry);
  } catch {
    return NextResponse.json({ ok: false, message: "Die Nachricht konnte nicht gespeichert werden." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
