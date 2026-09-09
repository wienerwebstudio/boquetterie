import { NextResponse } from "next/server";
import { getExtras } from "@/lib/cms";

/**
 * GET /api/extras[?cart=1]
 * Active extras for client components that have no server parent (cart drawer upsell).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const cartOnly = url.searchParams.get("cart") === "1";
  const extras = (await getExtras()).filter((e) => !cartOnly || e.showInCart);
  return NextResponse.json({ ok: true, extras }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
