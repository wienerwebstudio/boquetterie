import { redirectLocal } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { PARTNER_COOKIE, partnerCookieOptions } from "@/lib/partner-auth";

export const dynamic = "force-dynamic";

/** POST /api/partner/logout – ends the partner session. */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "partner-logout", limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  const res = redirectLocal("/partner?abgemeldet=1");
  res.cookies.set(PARTNER_COOKIE, "", partnerCookieOptions(0));
  return res;
}
