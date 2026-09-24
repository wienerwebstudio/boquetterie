import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getOrderById } from "@/lib/cms";
import { markOrderPaid, markOrderPaymentFailed } from "@/lib/orders";
import { stripeConfigured, verifyPayment } from "@/lib/payments";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { PaymentConfirmResponse } from "@/types/payments";

export const dynamic = "force-dynamic";

function tokenMatches(expected: string, given: unknown) {
  if (typeof given !== "string" || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

/**
 * POST /api/payments/stripe/confirm { orderId, token }
 * Called by the browser after `stripe.confirmPayment` (inline or after a
 * redirect). Never trusts the client: the PaymentIntent is retrieved server-side
 * and the order is marked paid only when Stripe reports `succeeded`. Idempotent.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "payments-confirm", limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  if (!stripeConfigured()) return NextResponse.json({ ok: false, message: "Stripe ist nicht konfiguriert." }, { status: 404 });

  let body: { orderId?: unknown; token?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  }
  const orderId = typeof body.orderId === "string" ? body.orderId.trim().toUpperCase() : "";
  const order = orderId ? await getOrderById(orderId) : null;
  if (!order || !tokenMatches(order.token, body.token)) {
    return NextResponse.json({ ok: false, message: "Bestellung nicht gefunden." }, { status: 404 });
  }
  if (order.payment.provider !== "stripe") {
    return NextResponse.json({ ok: false, message: "Diese Bestellung wird nicht über Stripe bezahlt." }, { status: 400 });
  }
  if (order.payment.status === "paid" || order.payment.status === "refunded") {
    const res: PaymentConfirmResponse = { ok: true, status: order.payment.status };
    return NextResponse.json(res);
  }

  try {
    const verified = await verifyPayment(order);
    if (verified.status === "paid") {
      await markOrderPaid(order.id, { provider: "stripe", reference: verified.reference, intentId: verified.intentId, note: "Zahlung per Stripe bestätigt" });
      return NextResponse.json({ ok: true, status: "paid" } satisfies PaymentConfirmResponse);
    }
    if (verified.status === "failed") {
      await markOrderPaymentFailed(order.id, { note: verified.message ?? "Zahlung per Stripe abgebrochen" });
      return NextResponse.json({ ok: true, status: "failed", message: verified.message } satisfies PaymentConfirmResponse);
    }
    return NextResponse.json({ ok: true, status: "pending", message: verified.message } satisfies PaymentConfirmResponse);
  } catch (err) {
    console.error("[payments] stripe confirm failed", err);
    return NextResponse.json({ ok: false, status: "pending", message: "Die Zahlung konnte gerade nicht geprüft werden." } satisfies PaymentConfirmResponse, { status: 502 });
  }
}
