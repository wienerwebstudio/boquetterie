import "server-only";
import Stripe from "stripe";
import type { Order } from "@/types";
import type { CreatePaymentResult } from "@/types/payments";
import { toCents, WebhookVerificationError, type PaymentProviderAdapter, type VerifyResult, type WebhookResult } from "./provider";

/**
 * Stripe adapter – PaymentIntents + Payment Element.
 *
 * Environment:
 *   STRIPE_SECRET_KEY                  server key (sk_test_… / sk_live_…)
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY browser key (pk_test_… / pk_live_…)
 *   STRIPE_WEBHOOK_SECRET              signing secret of the webhook endpoint (whsec_…)
 *
 * Flow: `createPayment` creates a PaymentIntent (amount from the server-side order,
 * never from the client) and returns its client secret. The browser confirms it
 * with the Payment Element. `verifyPayment` re-reads the intent, and the webhook
 * is the source of truth for asynchronous methods (EPS, Klarna, refunds).
 */

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export function stripePublishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
}

let client: Stripe | null = null;
export function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!client) client = new Stripe(key, { appInfo: { name: "Boquetterie", url: "https://boquetterie.at" } });
  return client;
}

function chargeId(intent: Stripe.PaymentIntent): string | undefined {
  const c = intent.latest_charge;
  return typeof c === "string" ? c : c?.id;
}

function intentStatusToVerify(intent: Stripe.PaymentIntent): VerifyResult {
  const base = { intentId: intent.id, reference: chargeId(intent) };
  switch (intent.status) {
    case "succeeded":
      return { status: "paid", ...base };
    case "processing":
      return { status: "pending", ...base, message: "Die Zahlung wird verarbeitet." };
    case "canceled":
      return { status: "failed", ...base, message: "Die Zahlung wurde abgebrochen." };
    default:
      // requires_payment_method / requires_confirmation / requires_action / requires_capture
      return { status: "pending", ...base, message: "Die Zahlung ist noch nicht abgeschlossen." };
  }
}

export const stripeProvider: PaymentProviderAdapter = {
  id: "stripe",
  isConfigured: stripeConfigured,

  async createPayment({ order }): Promise<CreatePaymentResult> {
    const stripe = stripeClient();
    const intent = await stripe.paymentIntents.create(
      {
        amount: toCents(order.totals.total),
        currency: "eur",
        automatic_payment_methods: { enabled: true },
        metadata: { orderId: order.id, method: order.payment.method },
        receipt_email: order.customer.email || undefined,
        description: `Boquetterie Bestellung ${order.id}`,
      },
      // Idempotent per order: a retried request returns the same intent instead of a duplicate.
      { idempotencyKey: `pi_${order.id}` },
    );
    if (!intent.client_secret) {
      return { status: "failed", provider: "stripe", intentId: intent.id, message: "Die Zahlung konnte nicht vorbereitet werden." };
    }
    return { status: "pending", provider: "stripe", intentId: intent.id, clientSecret: intent.client_secret };
  },

  async verifyPayment(order: Order): Promise<VerifyResult> {
    if (!order.payment.intentId) return { status: "unknown" };
    const intent = await stripeClient().paymentIntents.retrieve(order.payment.intentId);
    if (intent.metadata?.orderId && intent.metadata.orderId !== order.id) {
      return { status: "unknown", message: "Zahlung gehört zu einer anderen Bestellung." };
    }
    return intentStatusToVerify(intent);
  },

  async processWebhook(req: Request): Promise<WebhookResult> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new WebhookVerificationError("STRIPE_WEBHOOK_SECRET is not set");
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new WebhookVerificationError("Missing stripe-signature header");
    // The signature is computed over the raw bytes – never `req.json()` here.
    const raw = await req.text();
    let event: Stripe.Event;
    try {
      event = stripeClient().webhooks.constructEvent(raw, signature, secret);
    } catch (err) {
      throw new WebhookVerificationError(err instanceof Error ? err.message : "Invalid signature");
    }

    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        return { type: event.type, event: { kind: "paid", orderId: pi.metadata?.orderId, intentId: pi.id, reference: chargeId(pi), note: "Zahlung per Stripe bestätigt" } };
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const reason = pi.last_payment_error?.message;
        return { type: event.type, event: { kind: "failed", orderId: pi.metadata?.orderId, intentId: pi.id, note: reason ? `Stripe: ${reason}` : "Zahlung per Stripe fehlgeschlagen" } };
      }
      case "charge.refunded": {
        const charge = event.data.object;
        const intentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        const full = charge.amount_refunded >= charge.amount;
        return { type: event.type, event: { kind: "refunded", orderId: charge.metadata?.orderId, intentId, reference: charge.id, note: full ? "Zahlung per Stripe erstattet" : `Teilerstattung per Stripe (${(charge.amount_refunded / 100).toFixed(2)} €)` } };
      }
      default:
        return { type: event.type, event: null };
    }
  },
};

/* ---------------- Subscriptions (Blumen-Abo via Stripe Checkout) ---------------- */

export interface SubscriptionCheckoutInput {
  planName: string;
  planDescription?: string;
  /** Per-delivery price in EUR after the frequency discount. */
  unitAmount: number;
  interval: "week" | "month";
  intervalCount: number;
  siteUrl: string;
  metadata: Record<string, string>;
}

export async function createSubscriptionCheckout(input: SubscriptionCheckoutInput) {
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    locale: "de",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: toCents(input.unitAmount),
          recurring: { interval: input.interval, interval_count: input.intervalCount },
          product_data: {
            name: `Blumen-Abo ${input.planName}`,
            description: input.planDescription,
          },
        },
      },
    ],
    success_url: `${input.siteUrl}/blumen-abo?abo=erfolg`,
    cancel_url: `${input.siteUrl}/blumen-abo`,
    metadata: input.metadata,
    subscription_data: { metadata: input.metadata },
  });
  return { id: session.id, url: session.url };
}
