import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { getOrderById } from "@/lib/cms";
import { publicOrderView } from "@/lib/orders";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

/** Constant-time comparison; hashing first hides the length of the expected token as well. */
function tokenMatches(expected: string, given: string | null) {
  return timingSafeEqual(sha256(expected), sha256(given ?? ""));
}

/** One answer for "no such order" and "wrong token" – the endpoint must not confirm that an order number exists. */
const notFound = () => NextResponse.json({ ok: false, message: "Bestellung nicht gefunden." }, { status: 404 });

/**
 * GET /api/orders/BQ-XXXXXX?token=…
 * Returns the customer-facing view of an order. 404 if the order is unknown or the token does not match.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(req, { scope: "orders-get", limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const { id: rawId } = await ctx.params;
  let id: string;
  try {
    id = decodeURIComponent(rawId).trim().toUpperCase();
  } catch {
    return notFound();
  }
  const token = new URL(req.url).searchParams.get("token");
  const order = await getOrderById(id);
  if (!order || !order.token || !tokenMatches(order.token, token)) return notFound();
  return NextResponse.json({ ok: true, order: publicOrderView(order) });
}
