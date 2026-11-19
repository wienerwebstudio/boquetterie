import { getSettings } from "@/lib/content";
import { Checkout } from "@/components/checkout/checkout";
import { ordersPaused } from "@/lib/orders-paused";
import { getI18n } from "@/i18n/server";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/urls";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Payment methods are NOT passed from here – the checkout asks
 * `GET /api/payments/methods`, which only lists methods whose provider is
 * actually configured (Stripe/PayPal keys) and falls back to the mock provider.
 */
export default async function CheckoutPage({ searchParams }: Props) {
  const [settings, sp, { m }] = await Promise.all([getSettings(), searchParams, getI18n()]);
  if (ordersPaused()) {
    const t = m.checkout.paused;
    return (
      <div className="container-x py-24 text-center">
        <p className="eyebrow mb-3">{t.eyebrow}</p>
        <h1 className="display-2 text-ink">{t.title}</h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-ink-muted">{t.message}</p>
        <Button href={routes.shop} variant="outline" size="lg" className="mt-8">{t.backToShop}</Button>
      </div>
    );
  }
  return (
    <Checkout
      config={{
        cardsEnabled: settings.greetingCard.enabled === true,
        greetingMaxChars: settings.greetingCard.maxChars,
        freeCardIncluded: settings.greetingCard.freeCardIncluded,
        newsletterEnabled: settings.newsletterEnabled,
        cancelled: sp.cancelled === "1",
      }}
    />
  );
}
