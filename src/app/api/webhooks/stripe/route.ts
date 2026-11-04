import { NextResponse } from "next/server";
import { applyPaymentEvent } from "@/lib/orders";
import { processWebhook, stripeConfigured, WebhookVerificationError } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/stripe
 * Signature is verified against STRIPE_WEBHOOK_SECRET over the RAW body.
 * Handles payment_intent.succeeded / payment_intent.payment_failed / charge.refunded.
 * Always answers 200 for verified events (even unknown ones) so Stripe stops retrying.
 */
export async function POST(req: Request) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, message: "Stripe webhooks are not configured." }, { status: 404 });
  }
  try {
    const { type, event } = await processWebhook("stripe", req);
    if (!event) return NextResponse.json({ ok: true, received: true, ignored: type });
    const applied = await applyPaymentEvent(event);
    if (!applied.orderId) console.warn(`[webhooks/stripe] ${type}: no matching order`, event);
    return NextResponse.json({ ok: true, received: true, type, ...applied });
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return NextResponse.json({ ok: false, message: err.message }, { status: 400 });
    }
    console.error("[webhooks/stripe] failed", err);
    return NextResponse.json({ ok: false, message: "Webhook processing failed." }, { status: 500 });
  }
}
