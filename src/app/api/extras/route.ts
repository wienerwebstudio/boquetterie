import { NextResponse } from "next/server";
import { getExtras } from "@/lib/cms";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/extras[?cart=1]
 * Active extras for client components that have no server parent (cart drawer upsell).
 */
export async function GET(req: Request) {
  const limited = enforceRateLimit(req, { scope: "extras", limit: 120, windowMs: 60 * 1000 });
  if (limited) return limited;
  const url = new URL(req.url);
  const cartOnly = url.searchParams.get("cart") === "1";
  const extras = (await getExtras()).filter((e) => !cartOnly || e.showInCart);
  return NextResponse.json({ ok: true, extras }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
