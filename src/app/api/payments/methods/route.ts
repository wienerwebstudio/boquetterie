import { NextResponse } from "next/server";
import { getSettings } from "@/lib/cms";
import { getAvailablePaymentMethods, stripeConfigured, stripePublishableKey } from "@/lib/payments";
import { stripeMethodAvailability } from "@/lib/payments/stripe";
import type { PaymentMethodsResponse } from "@/types/payments";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments/methods
 * Payment methods that are enabled in settings AND backed by a configured
 * provider. Secrets never leave the server – only the Stripe publishable key.
 * Stripe methods that Stripe itself does not offer right now (switched off in the
 * Dashboard, capability inactive – e.g. Klarna) are left out, so a customer never
 * picks a method the payment form then does not show.
 */
export async function GET() {
  const settings = await getSettings();
  const stripe = stripeConfigured();
  const availability = stripe ? await stripeMethodAvailability() : null;
  const methods = getAvailablePaymentMethods(settings).filter((m) => m.provider !== "stripe" || !availability || availability[m.id] !== false);
  const body: PaymentMethodsResponse = {
    ok: true,
    methods,
    ...(stripe ? { stripePublishableKey: stripePublishableKey() } : {}),
    subscriptionCheckout: stripe && settings.subscriptionEnabled,
  };
  return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
}
