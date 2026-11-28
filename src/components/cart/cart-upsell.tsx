"use client";
import Image from "next/image";
import { Plus } from "lucide-react";
import type { CartItem, Extra } from "@/types";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { extraToCartExtra } from "@/lib/cart-helpers";
import { useCartExtras } from "./use-cart-totals";
import { events, track } from "@/components/analytics/track";

/**
 * "Noch etwas dazu?" – a calm strip of 3–4 extras not yet in the first item.
 * One click adds the extra to the first bouquet in the cart.
 */
export function CartUpsell({ items, extras: provided, max = 4, className }: { items: CartItem[]; extras?: Extra[]; max?: number; className?: string }) {
  const fetched = useCartExtras();
  const addExtra = useCart((s) => s.addExtra);
  const { m, fmt, price } = useI18n();
  const t = m.cart.upsell;
  const target = items[0];
  if (!target) return null;
  const source = provided ?? fetched;
  const inCart = new Set(target.extras.map((e) => e.extraId));
  const list = source.filter((e) => e.active && e.showInCart && !inCart.has(e.id)).slice(0, max);
  if (!list.length) return null;

  return (
    <section className={cn("", className)} aria-labelledby="cart-upsell-title">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 id="cart-upsell-title" className="font-serif text-[20px] text-ink">{t.title}</h3>
        <p className="text-[12px] text-ink-muted">{t.subtitle}</p>
      </div>
      <ul className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 scrollbar-none sm:-mx-6 sm:px-6">
        {list.map((e) => (
          <li key={e.id} className="w-[148px] shrink-0 snap-start">
            <div className="flex h-full flex-col rounded-md border border-line bg-white/70 p-2.5">
              <div className="relative aspect-square overflow-hidden rounded-sm bg-ivory-200">
                <Image src={e.image} alt={e.imageAlt} fill sizes="160px" className="object-cover" />
              </div>
              <p className="mt-2.5 truncate text-[13.5px] font-semibold text-ink">{e.name}</p>
              <p className="text-[12.5px] tabular-nums text-ink-muted">{price(e.price)}</p>
              <button
                type="button"
                onClick={() => { addExtra(target.id, extraToCartExtra(e)); track(events.addExtra, { extra_id: e.id, value: e.price }); }}
                className="mt-2.5 inline-flex h-10 w-full items-center justify-center gap-1 rounded-md border border-forest/60 text-[13px] font-semibold text-forest transition-colors hover:bg-forest hover:text-ivory"
                aria-label={fmt(t.addAria, { name: e.name, price: price(e.price) })}
              >
                <Plus className="size-3.5" aria-hidden /> {t.add}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
