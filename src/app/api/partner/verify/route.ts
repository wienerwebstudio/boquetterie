import type { NextRequest } from "next/server";
import { redirectLocal } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { consumePartnerLoginToken, createPartnerSessionValue, getPartnerSecret, PARTNER_COOKIE, partnerCookieOptions, resolvePartnerSession } from "@/lib/partner-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/partner/verify – form field `token`. Burns the magic-link token and sets the
 * partner session cookie. POST only: mail scanners follow GET links and would burn the
 * single-use token before the partner clicks it (/partner/anmelden shows the button).
 */
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { scope: "partner-verify", limit: 20, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  const form = await req.formData().catch(() => null);
  const token = String(form?.get("token") ?? "");
  const secret = getPartnerSecret();
  if (!secret) return redirectLocal("/partner?link=ungueltig");

  const result = await consumePartnerLoginToken(token);
  if (result.status !== "valid") return redirectLocal("/partner?link=ungueltig");
  const value = createPartnerSessionValue(secret, result.partnerId, result.email);
  // The address may have been removed from the allow-list since the link was sent.
  if (!(await resolvePartnerSession(value))) return redirectLocal("/partner?link=ungueltig");

  const res = redirectLocal("/partner");
  res.cookies.set(PARTNER_COOKIE, value, partnerCookieOptions());
  return res;
}
