import { NextResponse } from "next/server";
import { redirectLocal } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isValidTrackingToken } from "@/lib/outreach/queue";
import { recordClick } from "@/lib/outreach/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/o/c/<token>?i=<n> – click redirect of an outreach mail. Only redirects to
 * the n-th URL stored with that very send (no open redirect); anything else lands
 * on the shop's home page.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const limited = enforceRateLimit(req, { scope: "outreach-click", limit: 60, windowMs: 60 * 1000 });
  if (limited) return limited;
  const { token } = await params;
  const index = new URL(req.url).searchParams.get("i");
  let target: string | null = null;
  if (isValidTrackingToken(token)) {
    target = await recordClick(token, index).catch((err: unknown) => {
      console.error("[outreach] click tracking failed", err);
      return null;
    });
  }
  if (!target) return redirectLocal("/", 302);
  const res = NextResponse.redirect(target, 302);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
