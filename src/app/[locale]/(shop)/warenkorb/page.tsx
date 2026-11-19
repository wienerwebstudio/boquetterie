import type { Metadata } from "next";
import { getExtras, getSettings } from "@/lib/cms";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CartPageView } from "@/components/cart/cart-page";

export const metadata: Metadata = {
  title: "Warenkorb",
  description: "Deine ausgewählten Sträuße und Extras – bereit für die Lieferung in Wien.",
  robots: { index: false, follow: true },
};

export default async function CartPage() {
  const [allExtras, settings] = await Promise.all([getExtras(), getSettings()]);
  const extras = allExtras.filter((e) => e.showInCart);
  return (
    <div className="container-x pb-20 pt-5 sm:pt-8 lg:pb-28">
      <Breadcrumbs items={[{ label: "Warenkorb" }]} />
      <header className="mb-8 mt-6 sm:mb-12">
        <p className="eyebrow mb-3">Fast geschafft</p>
        <h1 className="display-2 text-ink">Warenkorb</h1>
      </header>
      <CartPageView extras={extras} cardsEnabled={settings.greetingCard?.enabled === true} />
    </div>
  );
}
