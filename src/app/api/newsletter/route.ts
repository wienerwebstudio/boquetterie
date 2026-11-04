import { NextResponse } from "next/server";
import { addNewsletterSubscriber, getSettings } from "@/lib/cms";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** POST /api/newsletter { email, website?: "" } – `website` is a honeypot and must be empty. */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "newsletter", limit: 5, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  const settings = await getSettings();
  if (!settings.newsletterEnabled) {
    return NextResponse.json({ ok: false, message: "Der Newsletter ist derzeit nicht verfügbar." }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("invalid");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  }

  // Honeypot: the hidden `website` field must stay empty – bots fill it. Pretend success, store nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }
  if (body.website !== undefined && typeof body.website !== "string") {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || /[\s<>"'`,;]/.test(email) || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, message: "Bitte gib eine gültige E-Mail-Adresse ein." }, { status: 400 });
  }
  await addNewsletterSubscriber(email);
  return NextResponse.json({ ok: true });
}
