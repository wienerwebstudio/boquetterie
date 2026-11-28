import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getOrderById, updateOrder } from "@/lib/cms";
import { enforceRateLimit } from "@/lib/rate-limit";
import { PAYMENT_NOTE_PREFIX, paymentNoteText, type SubmitFailureReason } from "@/lib/payment-note";

export const dynamic = "force-dynamic";

const REASONS = new Set<SubmitFailureReason>(["incomplete", "wallet_closed", "other"]);
const MAX_NOTES_PER_ORDER = 10;

function tokenMatches(expected: string, given: unknown) {
  if (typeof given !== "string" || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

/**
 * POST /api/orders/payment-note { orderId, token, reason, method, detail? }
 * Checkout step 5: the order was created with "Jetzt kaufen", but Stripe's
 * `elements.submit()` stopped (card fields incomplete, Apple/Google Pay sheet closed).
 * Adds "Zahlung nicht abgeschlossen: …" to the order history so the team sees why the
 * order is unpaid. Only for unpaid orders, with the order token, max. 10 notes per order.
 * Changes nothing about the payment.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "orders-payment-note", limit: 20, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  let body: { orderId?: unknown; token?: unknown; reason?: unknown; method?: unknown; detail?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false }, { status: 400 });
  const reason = typeof body.reason === "string" && REASONS.has(body.reason as SubmitFailureReason) ? (body.reason as SubmitFailureReason) : null;
  const orderId = typeof body.orderId === "string" ? body.orderId.trim().toUpperCase().slice(0, 20) : "";
  const method = typeof body.method === "string" ? body.method.replace(/[^a-z_]/g, "").slice(0, 20) : "";
  if (!reason || !orderId) return NextResponse.json({ ok: false }, { status: 400 });

  const order = await getOrderById(orderId);
  if (!order || !tokenMatches(order.token, body.token)) return NextResponse.json({ ok: false }, { status: 404 });
  if (order.payment.status !== "pending" && order.payment.status !== "failed") return NextResponse.json({ ok: false }, { status: 409 });

  const note = paymentNoteText(reason, method, typeof body.detail === "string" ? body.detail : undefined);
  let added = false;
  await updateOrder(order.id, (o) => {
    if (o.payment.status !== "pending" && o.payment.status !== "failed") return o;
    if (o.history.filter((h) => h.note?.startsWith(PAYMENT_NOTE_PREFIX)).length >= MAX_NOTES_PER_ORDER) return o;
    added = true;
    return { ...o, history: [...o.history, { status: o.status, at: new Date().toISOString(), note }] };
  });
  return NextResponse.json({ ok: true, added });
}
