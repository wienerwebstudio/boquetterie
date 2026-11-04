import { NextResponse } from "next/server";
import { getSettings } from "@/lib/cms";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { isAuthConfigured } from "@/lib/auth/session";
import { createLoginToken, normalizeEmail } from "@/lib/auth/tokens";
import { sendMagicLinkMail } from "@/lib/auth/mail";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;

/** The one answer every valid request gets – whether or not the address is known. */
const SENT_MESSAGE = "Wenn die Adresse gültig ist, ist dein Login-Link unterwegs. Bitte sieh in dein Postfach – der Link ist 15 Minuten gültig.";

function tooMany(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, message: "Zu viele Anfragen. Bitte versuch es in ein paar Minuten noch einmal." },
    { status: 429, headers: { "retry-after": String(retryAfterSeconds) } },
  );
}

/** POST /api/auth/request-link { email, website? } – website is a honeypot. */
export async function POST(req: Request) {
  const ip = rateLimit(clientKey(req), { scope: "auth-link-ip", limit: LIMIT, windowMs: WINDOW_MS });
  if (!ip.ok) return tooMany(ip.retryAfterSeconds);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  }
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const email = typeof rec.email === "string" ? normalizeEmail(rec.email) : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, message: "Bitte gib eine gültige E-Mail-Adresse ein." }, { status: 400 });
  }
  // Bots fill the hidden field – pretend everything went fine.
  if (typeof rec.website === "string" && rec.website.trim() !== "") {
    return NextResponse.json({ ok: true, message: SENT_MESSAGE });
  }

  const perEmail = rateLimit(email, { scope: "auth-link-email", limit: LIMIT, windowMs: WINDOW_MS });
  if (!perEmail.ok) return tooMany(perEmail.retryAfterSeconds);

  if (!isAuthConfigured()) {
    return NextResponse.json({ ok: false, message: "Die Anmeldung ist derzeit nicht verfügbar. Bitte versuch es später noch einmal." }, { status: 503 });
  }

  const settings = await getSettings();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || settings.seo.siteUrl).replace(/\/$/, "");
  const token = await createLoginToken(email);
  const url = `${siteUrl}/auth/verify?token=${token}`;
  // A failing mail provider must not leak into the response (it would reveal timing/state to a caller).
  sendMagicLinkMail({ to: email, url, brandName: settings.brand.name, siteUrl }).catch((err) => console.error("[auth] magic link mail failed", err));

  return NextResponse.json({ ok: true, message: SENT_MESSAGE });
}
