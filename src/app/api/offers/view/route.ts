import { NextResponse } from "next/server";
import { findOfferByToken, markOfferViewed } from "@/lib/offers";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isAdminAuthenticated } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

/**
 * POST /api/offers/view { token }
 * Beacon from the offer page: records the first view ("Angesehen"). Sent by the
 * browser, so link previews (WhatsApp, mail scanners) that only fetch the HTML do
 * not count. Always answers 204 – it reveals nothing about the token.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "offer-view", limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  try {
    const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
    const offer = await findOfferByToken(body?.token);
    // The team previewing the page does not count as "Angesehen".
    if (offer && !(await isAdminAuthenticated())) await markOfferViewed(offer);
  } catch (err) {
    console.error("[offers] view beacon failed", err);
  }
  return new NextResponse(null, { status: 204 });
}
