import "server-only";
import type { Order, SiteSettings } from "@/types";
import type { CreatePaymentResult, PaymentMethodId, PaymentProviderId, PublicPaymentMethod } from "@/types/payments";
import { mockProvider, MOCK_REFERENCE_PREFIX, isMockReference, mockPaymentsAllowed } from "@/lib/payments/mock";
import { stripeProvider, stripeConfigured, stripePublishableKey, resumeStripeIntent, cancelStripeIntent, stripeIntentState } from "@/lib/payments/stripe";
import { paypalProvider, paypalConfigured } from "@/lib/payments/paypal";
import type { PaymentProviderAdapter, VerifyResult, WebhookResult } from "@/lib/payments/provider";

export { WebhookVerificationError } from "@/lib/payments/provider";
export type { PaymentEvent, VerifyResult, WebhookResult } from "@/lib/payments/provider";
export { stripeConfigured, stripePublishableKey, paypalConfigured, MOCK_REFERENCE_PREFIX, stripeIntentState, cancelStripeIntent };

/**
 * Payment facade.
 *
 * Providers are activated purely by environment variables (see docs/PAYMENTS.md):
 *   - stripe → STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
 *   - paypal → PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET (+ PAYPAL_ENV)
 *   - mock   → fallback when Stripe is not configured – in production only with PAYMENTS_ALLOW_MOCK=true
 *
 * Method → provider mapping:
 *   card / apple_pay / google_pay / eps / klarna → stripe (fallback: mock where allowed, else unavailable)
 *   paypal                                       → paypal (no fallback – hidden when unconfigured)
 *
 * The shop never talks to a provider directly – everything goes through
 * `createPayment` / `verifyPayment` / `processWebhook`. Applying results to an
 * order lives in `src/lib/orders.ts`.
 */

const PROVIDERS: Record<PaymentProviderId, PaymentProviderAdapter> = {
  mock: mockProvider,
  stripe: stripeProvider,
  paypal: paypalProvider,
};

const STRIPE_METHODS: ReadonlySet<PaymentMethodId> = new Set(["card", "apple_pay", "google_pay", "eps", "klarna"]);

/** Resolves which provider would handle a method right now; `null` = method unavailable. */
export function providerForMethod(method: PaymentMethodId): PaymentProviderId | null {
  if (method === "paypal") return paypalConfigured() ? "paypal" : null;
  if (STRIPE_METHODS.has(method)) return stripeConfigured() ? "stripe" : mockPaymentsAllowed() ? "mock" : null;
  return null;
}

/** Methods enabled in settings AND backed by a configured provider – what the storefront may offer. */
export function getAvailablePaymentMethods(settings: SiteSettings): PublicPaymentMethod[] {
  const out: PublicPaymentMethod[] = [];
  for (const m of settings.payments) {
    if (!m.enabled) continue;
    const provider = providerForMethod(m.id);
    if (!provider) continue;
    out.push({ id: m.id, label: m.label, provider });
  }
  return out;
}

/** True if the reference was produced by the mock provider (i.e. no real charge happened). */
export function isMockPayment(reference?: string) {
  return isMockReference(reference);
}

/** True when this order was (or will be) settled without a real charge. */
export function isTestOrder(order: Pick<Order, "payment">) {
  return order.payment.provider === "mock" || isMockPayment(order.payment.reference);
}

export function createPayment(ctx: { order: Order; siteUrl: string }): Promise<CreatePaymentResult> {
  const provider = ctx.order.payment.provider as PaymentProviderId | undefined;
  if (!provider || !PROVIDERS[provider]) {
    return Promise.resolve({ status: "failed", provider: provider ?? "mock", message: "Unbekannter Zahlungsanbieter." });
  }
  if (!(ctx.order.totals.total >= 0) || !Number.isFinite(ctx.order.totals.total)) {
    return Promise.resolve({ status: "failed", provider, message: "Ungültiger Betrag." });
  }
  return PROVIDERS[provider].createPayment(ctx);
}

/**
 * Continues the open payment of a stored order (individual offers: "pay" clicked again).
 * Stripe: the same PaymentIntent (client secret) while it is still open, else its final
 * state; PayPal: the same PayPal order (idempotent request id); mock: a new mock payment.
 * Amounts always come from the stored order.
 */
export async function resumePayment(ctx: { order: Order; siteUrl: string }): Promise<CreatePaymentResult> {
  const provider = ctx.order.payment.provider as PaymentProviderId | undefined;
  if (provider === "stripe" && ctx.order.payment.intentId) {
    const { verify, clientSecret } = await resumeStripeIntent(ctx.order.payment.intentId);
    if (verify.status === "paid") return { status: "paid", provider, intentId: verify.intentId, reference: verify.reference };
    if (clientSecret) return { status: "pending", provider, intentId: verify.intentId, clientSecret };
    if (verify.status === "pending") return { status: "pending", provider, intentId: verify.intentId, message: verify.message };
    return { status: "failed", provider, intentId: verify.intentId, message: verify.message ?? "Die Zahlung wurde abgebrochen." };
  }
  return createPayment(ctx);
}

/** Makes sure an unpaid provider payment can never be completed any more (Stripe: cancel the intent). */
export async function cancelOpenPayment(order: Order): Promise<void> {
  if (order.payment.provider === "stripe" && order.payment.intentId) await cancelStripeIntent(order.payment.intentId);
}

/** Re-checks the payment state with the provider that handled the order. */
export function verifyPayment(order: Order): Promise<VerifyResult> {
  const provider = order.payment.provider as PaymentProviderId | undefined;
  if (!provider || !PROVIDERS[provider]) return Promise.resolve({ status: "unknown" });
  return PROVIDERS[provider].verifyPayment(order);
}

/** Parses + verifies a provider webhook. Throws `WebhookVerificationError` on a bad signature. */
export function processWebhook(provider: PaymentProviderId, req: Request): Promise<WebhookResult> {
  return PROVIDERS[provider].processWebhook(req);
}

/**
 * Absolute site origin for provider redirects (PayPal return/cancel, Stripe Checkout).
 * Prefers NEXT_PUBLIC_SITE_URL; in development falls back to the request origin so
 * `localhost:3100` style setups work; in production falls back to settings.seo.siteUrl.
 */
export function resolveSiteUrl(req: Request, settings: SiteSettings) {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") {
    const origin = req.headers.get("origin") || new URL(req.url).origin;
    return origin.replace(/\/$/, "");
  }
  return settings.seo.siteUrl.replace(/\/$/, "");
}
