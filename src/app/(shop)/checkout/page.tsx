import { getSettings } from "@/lib/cms";
import { Checkout } from "@/components/checkout/checkout";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Payment methods are NOT passed from here – the checkout asks
 * `GET /api/payments/methods`, which only lists methods whose provider is
 * actually configured (Stripe/PayPal keys) and falls back to the mock provider.
 */
export default async function CheckoutPage({ searchParams }: Props) {
  const [settings, sp] = await Promise.all([getSettings(), searchParams]);
  return (
    <Checkout
      config={{
        greetingMaxChars: settings.greetingCard.maxChars,
        freeCardIncluded: settings.greetingCard.freeCardIncluded,
        newsletterEnabled: settings.newsletterEnabled,
        cancelled: sp.cancelled === "1",
      }}
    />
  );
}
