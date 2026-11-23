"use client";
import Link from "@/components/ui/link";
import { ArrowLeft, Lock } from "lucide-react";
import type { Extra } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart, cartCount } from "@/store/cart";
import { routes } from "@/lib/urls";
import { useI18n } from "@/i18n/client";
import { CartLine } from "./cart-line";
import { CartSurprise } from "./cart-surprise";
import { CartUpsell } from "./cart-upsell";
import { CartSummary } from "./cart-summary";
import { CartEmpty, CartTrustRow } from "./cart-drawer";
import { CartDeliveryProvider } from "./cart-delivery";

/** Full-page cart. Lines left, sticky summary right. */
export function CartPageView({ extras, cardsEnabled = false }: { extras: Extra[]; cardsEnabled?: boolean }) {
  const hydrated = useCart((s) => s.hydrated);
  const items = useCart((s) => s.items);
  const { m, fmt, plural } = useI18n();

  if (!hydrated) {
    return (
      <div role="status" className="grid gap-10 lg:grid-cols-12" aria-busy="true" aria-label={m.cart.loading}>
        <div className="space-y-6 lg:col-span-7"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div>
        <div className="lg:col-span-5"><Skeleton className="h-64 w-full" /></div>
      </div>
    );
  }

  if (!items.length) {
    return <div className="mx-auto max-w-md rounded-lg border border-line bg-white/50"><CartEmpty cardsEnabled={cardsEnabled} /></div>;
  }

  const count = cartCount(items);
  const checkout = <Button href={routes.checkout} size="xl" full icon={<Lock className="size-4" aria-hidden />}>{m.cart.checkout}</Button>;

  return (
    <CartDeliveryProvider items={items}>
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
      <p className="sr-only" aria-live="polite">{fmt(m.cart.liveCount, { count: plural(count, m.cart.items) })}</p>
      <section className="lg:col-span-7" aria-labelledby="cart-items-title">
        <h2 id="cart-items-title" className="sr-only">{m.cart.itemsHeading}</h2>
        <ul className="divide-y divide-line border-y border-line">
          {items.map((item) => (
            <li key={item.id} className="py-6"><CartLine item={item} compact={false} /></li>
          ))}
        </ul>
        <Link href={routes.shop} className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-forest">
          <ArrowLeft className="size-4" aria-hidden /> {m.cart.continueShopping}
        </Link>
        <div className="mt-10 space-y-8">
          <CartSurprise items={items} cardsEnabled={cardsEnabled} />
          <CartUpsell items={items} extras={extras} />
        </div>
      </section>

      <aside className="lg:col-span-5">
        <div className="rounded-lg border border-line bg-white/60 p-5 sm:p-6 lg:sticky lg:top-28">
          <h2 className="font-serif text-2xl text-ink">{m.cart.summaryTitle}</h2>
          <CartSummary className="mt-5" />
          <div className="mt-6">{checkout}</div>
          <CartTrustRow className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11.5px] text-ink-muted" />
        </div>
      </aside>
    </div>
    </CartDeliveryProvider>
  );
}
