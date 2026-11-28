import { NextResponse } from "next/server";
import { applyPaymentEvent } from "@/lib/orders";
import { processWebhook, stripeConfigured, WebhookVerificationError } from "@/lib/payments";
import { adminMailAddress, escapeHtml, sendMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/stripe
 * Signature is verified against STRIPE_WEBHOOK_SECRET over the RAW body.
 * Handles payment_intent.succeeded / payment_intent.payment_failed / charge.refunded,
 * and mails MAIL_ADMIN on charge.dispute.created (chargebacks need an answer in the Dashboard).
 * Always answers 200 for verified events (even unknown ones) so Stripe stops retrying.
 */
export async function POST(req: Request) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, message: "Stripe webhooks are not configured." }, { status: 404 });
  }
  try {
    const { type, event, alert } = await processWebhook("stripe", req);
    if (alert) await notifyAdmin(alert);
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

/** A failing alert mail must not make Stripe retry the event – it is logged instead. */
async function notifyAdmin(alert: { subject: string; text: string }) {
  console.warn(`[webhooks/stripe] ${alert.subject}: ${alert.text}`);
  const to = adminMailAddress();
  if (!to) return;
  await sendMail({ to, subject: alert.subject, html: `<p>${escapeHtml(alert.text)}</p>`, tags: { type: "stripe_alert" } }).catch((err) =>
    console.error("[webhooks/stripe] alert mail failed", err),
  );
}
