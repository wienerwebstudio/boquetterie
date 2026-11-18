import { NextResponse } from "next/server";
import { getOrderById, updateOrder } from "@/lib/cms";
import { readFoundVia } from "@/lib/found-via";
import { tokenMatches } from "@/lib/mail/reminders";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/reviews/found-via { order, token, source, other? }
 * Stores the answer to "Wie hast du uns gefunden?" on the order – also without a review.
 * The mail only links to the review page (GET stores nothing, so mail scanners can't answer).
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "reviews-found-via", limit: 10, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;
  let body: Record<string, unknown>;
  try {
    const parsed = (await req.json()) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const answer = readFoundVia(body.source, body.other);
  const orderId = typeof body.order === "string" ? body.order.trim().toUpperCase().slice(0, 20) : "";
  if (!answer || !orderId) return NextResponse.json({ ok: false, message: "Bitte wähle eine Antwort." }, { status: 422 });
  const order = await getOrderById(orderId);
  if (!order || !tokenMatches(order.token, typeof body.token === "string" ? body.token : "")) {
    return NextResponse.json({ ok: false, message: "Der Link ist ungültig oder abgelaufen." }, { status: 404 });
  }
  await updateOrder(order.id, (o) => ({ ...o, foundVia: answer }));
  return NextResponse.json({ ok: true });
}
