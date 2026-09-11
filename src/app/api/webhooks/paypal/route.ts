import { NextResponse } from "next/server";
import { applyPaymentEvent } from "@/lib/orders";
import { paypalConfigured, processWebhook, WebhookVerificationError } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/paypal (optional – the return URL already captures & marks paid)
 * Verified via PayPal's verify-webhook-signature API when PAYPAL_WEBHOOK_ID is set;
 * without it events are ignored in production. Handles PAYMENT.CAPTURE.COMPLETED /
 * DENIED / REFUNDED.
 */
export async function POST(req: Request) {
  if (!paypalConfigured()) return NextResponse.json({ ok: false, message: "PayPal is not configured." }, { status: 404 });
  try {
    const { type, event } = await processWebhook("paypal", req);
    if (!event) return NextResponse.json({ ok: true, received: true, ignored: type });
    const applied = await applyPaymentEvent(event);
    if (!applied.orderId) console.warn(`[webhooks/paypal] ${type}: no matching order`, event);
    return NextResponse.json({ ok: true, received: true, type, ...applied });
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return NextResponse.json({ ok: false, message: err.message }, { status: 400 });
    }
    console.error("[webhooks/paypal] failed", err);
    return NextResponse.json({ ok: false, message: "Webhook processing failed." }, { status: 500 });
  }
}
