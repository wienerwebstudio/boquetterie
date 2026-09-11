import { NextResponse } from "next/server";
import { getSettings } from "@/lib/cms";
import { getAvailablePaymentMethods, stripeConfigured, stripePublishableKey } from "@/lib/payments";
import type { PaymentMethodsResponse } from "@/types/payments";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments/methods
 * Payment methods that are enabled in settings AND backed by a configured
 * provider. Secrets never leave the server – only the Stripe publishable key.
 */
export async function GET() {
  const settings = await getSettings();
  const stripe = stripeConfigured();
  const body: PaymentMethodsResponse = {
    ok: true,
    methods: getAvailablePaymentMethods(settings),
    ...(stripe ? { stripePublishableKey: stripePublishableKey() } : {}),
    subscriptionCheckout: stripe && settings.subscriptionEnabled,
  };
  return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
}
