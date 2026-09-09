import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getOrderById } from "@/lib/cms";
import { publicOrderView } from "@/lib/orders";

export const dynamic = "force-dynamic";

function tokenMatches(expected: string, given: string | null) {
  if (!given || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

/**
 * GET /api/orders/BQ-XXXXXX?token=…
 * Returns the customer-facing view of an order. 404 if unknown, 403 if the token is wrong.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const order = await getOrderById(decodeURIComponent(id).trim().toUpperCase());
  if (!order) return NextResponse.json({ ok: false, message: "Bestellung nicht gefunden." }, { status: 404 });
  if (!tokenMatches(order.token, url.searchParams.get("token"))) {
    return NextResponse.json({ ok: false, message: "Der Link ist ungültig." }, { status: 403 });
  }
  return NextResponse.json({ ok: true, order: publicOrderView(order) });
}
