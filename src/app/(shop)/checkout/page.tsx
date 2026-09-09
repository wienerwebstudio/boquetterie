import { getSettings } from "@/lib/cms";
import { Checkout } from "@/components/checkout/checkout";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const settings = await getSettings();
  return (
    <Checkout
      config={{
        payments: settings.payments.filter((p) => p.enabled),
        greetingMaxChars: settings.greetingCard.maxChars,
        freeCardIncluded: settings.greetingCard.freeCardIncluded,
        newsletterEnabled: settings.newsletterEnabled,
      }}
    />
  );
}
