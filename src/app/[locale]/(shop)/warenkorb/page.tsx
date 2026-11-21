import type { Metadata } from "next";
import { getExtras, getSettings } from "@/lib/content";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CartPageView } from "@/components/cart/cart-page";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return {
    title: m.cart.metaTitle,
    description: m.cart.metaDescription,
    robots: { index: false, follow: true },
  };
}

export default async function CartPage() {
  const [allExtras, settings, { m }] = await Promise.all([getExtras(), getSettings(), getI18n()]);
  const extras = allExtras.filter((e) => e.showInCart);
  return (
    <div className="container-x pb-20 pt-5 sm:pt-8 lg:pb-28">
      <Breadcrumbs items={[{ label: m.cart.title }]} />
      <header className="mb-8 mt-6 sm:mb-12">
        <p className="eyebrow mb-3">{m.cart.eyebrow}</p>
        <h1 className="display-2 text-ink">{m.cart.title}</h1>
      </header>
      <CartPageView extras={extras} cardsEnabled={settings.greetingCard?.enabled === true} />
    </div>
  );
}
