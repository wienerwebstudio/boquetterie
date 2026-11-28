import { after, NextResponse } from "next/server";
import { getSettings } from "@/lib/cms";
import { enforceRateLimit, rateLimit } from "@/lib/rate-limit";
import { createPartnerLoginToken, findPartnerByPortalEmail, getPartnerSecret, normalizePartnerEmail, PARTNER_TOKEN_TTL_MINUTES } from "@/lib/partner-auth";
import { sendPartnerPortalLoginMail } from "@/lib/mail";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const WINDOW_MS = 10 * 60 * 1000;

/** The one answer every valid request gets – whether or not the address is allow-listed (no enumeration). */
const PARTNER_LINK_MESSAGE = "Falls die Adresse freigeschaltet ist, kommt gleich ein Link. Bitte sieh in dein Postfach – er ist 30 Minuten gültig.";

/** POST /api/partner/request-link { email, website? } – `website` is a honeypot. */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "partner-link-ip", limit: 5, windowMs: WINDOW_MS });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  }
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const email = typeof rec.email === "string" ? normalizePartnerEmail(rec.email) : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, message: "Bitte gib eine gültige E-Mail-Adresse ein." }, { status: 400 });
  }
  if (typeof rec.website === "string" && rec.website.trim() !== "") return NextResponse.json({ ok: true, message: PARTNER_LINK_MESSAGE });

  const perEmail = rateLimit(email, { scope: "partner-link-email", limit: 3, windowMs: WINDOW_MS });
  if (!perEmail.ok) return NextResponse.json({ ok: true, message: PARTNER_LINK_MESSAGE });

  const work = async () => {
    const secret = getPartnerSecret();
    if (!secret) {
      console.error("[partner] portal login disabled: PARTNER_SECRET/ADMIN_SECRET missing");
      return;
    }
    const partner = await findPartnerByPortalEmail(email);
    if (!partner) return;
    const settings = await getSettings();
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || settings.seo.siteUrl).replace(/\/$/, "");
    const token = await createPartnerLoginToken(partner.id, email);
    const r = await sendPartnerPortalLoginMail({ to: email, url: `${siteUrl}/partner/anmelden?token=${token}`, partnerName: partner.name, validMinutes: PARTNER_TOKEN_TTL_MINUTES, siteUrl });
    if (!r.sent && r.provider !== "console") console.error("[partner] portal login mail not sent", r.error ?? r.provider);
  };
  // After the response: known and unknown addresses take the same time to answer.
  const run = () => work().catch((err) => console.error("[partner] portal login link failed", err));
  try { after(run); } catch { await run(); }

  return NextResponse.json({ ok: true, message: PARTNER_LINK_MESSAGE });
}
