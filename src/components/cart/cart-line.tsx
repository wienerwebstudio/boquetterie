"use client";
import Image from "next/image";
import Link from "@/components/ui/link";
import { CalendarDays, Minus, Plus, X, MessageSquare } from "lucide-react";
import type { CartItem } from "@/types";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { routes } from "@/lib/urls";
import { truncateMessage } from "@/lib/cart-helpers";
import { useCartDelivery } from "./cart-delivery";
import { CartLineDelivery } from "./cart-line-delivery";
import { events, track } from "@/components/analytics/track";
import { cartLineValue } from "@/components/analytics/event-props";

export function CartLine({ item, compact = true, className }: { item: CartItem; compact?: boolean; className?: string }) {
  const setQuantity = useCart((s) => s.setQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const removeExtra = useCart((s) => s.removeExtra);
  const setExtraQuantity = useCart((s) => s.setExtraQuantity);
  const removeLine = () => {
    removeItem(item.id);
    track(events.removeFromCart, { product_id: item.productId, value: cartLineValue(item) });
  };
  const changeQuantity = (quantity: number) => {
    if (quantity <= 0) { removeLine(); return; }
    setQuantity(item.id, quantity);
  };
  const changeExtra = (extra: CartItem["extras"][number], quantity: number) => {
    if (quantity <= 0) { removeExtra(item.id, extra.extraId); track(events.removeExtra, { extra_id: extra.extraId }); return; }
    setExtraQuantity(item.id, extra.extraId, quantity);
    if (quantity > extra.quantity) track(events.addExtra, { extra_id: extra.extraId, value: Math.round(extra.price * (quantity - extra.quantity) * 100) / 100 });
  };
  const { m, fmt, price, dateShort } = useI18n();
  const t = m.cart.line;
  const { snapshot } = item;
  const href = routes.product(snapshot.slug);
  const delivery = useCartDelivery();
  const anchor = delivery?.anchorId === item.id ? delivery : null;
  const expired = anchor?.visibleIssue === "expired";
  // All lines share the order's slot: show its window once it is chosen.
  const windowLabel = delivery && item.deliveryDate === delivery.date && delivery.complete && delivery.windows.length > 1
    ? delivery.windows.find((w) => w.id === delivery.windowId)?.label
    : undefined;

  return (
    <article className={cn("flex gap-4", className)} aria-label={`${snapshot.name}, ${snapshot.sizeLabel}`}>
      <Link href={href} tabIndex={-1} aria-hidden="true" className={cn("relative shrink-0 overflow-hidden rounded-md bg-ivory-200", compact ? "size-[88px]" : "size-24 sm:size-32")}>
        <Image src={snapshot.image} alt="" fill sizes="128px" className="object-cover" />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-serif text-[20px] leading-tight text-ink"><Link href={href} className="hover:text-forest">{snapshot.name}</Link></h3>
            <p className="mt-0.5 text-[13px] text-ink-muted">{snapshot.sizeLabel}{snapshot.colorLabel ? ` · ${fmt(t.color, { color: snapshot.colorLabel })}` : ""} · {snapshot.tagline}</p>
            {item.floristNote && <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-muted">{fmt(t.wish, { note: item.floristNote })}</p>}
          </div>
          <p className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">{price(snapshot.unitPrice * item.quantity)}</p>
        </div>

        {(item.deliveryDate || !anchor?.visibleIssue) && <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-muted">
          <CalendarDays className="size-3.5 shrink-0 text-forest" aria-hidden />
          {item.deliveryDate ? (
            <span>
              {t.delivery} <span className={cn("font-semibold", expired ? "text-ink-muted line-through" : "text-ink")}>{dateShort(item.deliveryDate)}</span>
              {windowLabel && <span> · {windowLabel}</span>}
              {item.postalCode && <span> · {item.postalCode}</span>}
            </span>
          ) : (
            <span>{t.chooseDateInCheckout}</span>
          )}
        </p>}
        {anchor && <CartLineDelivery delivery={anchor} />}

        {item.message && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink-muted">
            <MessageSquare className="size-3.5 shrink-0 text-forest" aria-hidden />
            <span className="truncate font-serif italic text-[14.5px] text-ink">„{truncateMessage(item.message, compact ? 34 : 60)}“</span>
            {item.anonymous && <span className="shrink-0 rounded-sm bg-sand px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink">{t.anonymous}</span>}
          </p>
        )}

        {item.extras.length > 0 && (
          <ul className="mt-2.5 space-y-1.5 border-l-2 border-sand pl-3" aria-label={t.extras}>
            {item.extras.map((e) => (
              <li key={e.extraId} className="flex items-center gap-2 text-[13px]">
                <div className="relative size-7 shrink-0 overflow-hidden rounded-sm bg-ivory-200">
                  <Image src={e.image} alt="" fill sizes="28px" className="object-cover" />
                </div>
                <span className="min-w-0 flex-1 truncate text-ink">
                  {e.quantity > 1 && <span className="tabular-nums text-ink-muted">{e.quantity} × </span>}{e.name}
                </span>
                {!compact && (
                  <span className="inline-flex items-center rounded-md border border-line">
                    <button type="button" onClick={() => changeExtra(e, e.quantity - 1)} aria-label={fmt(t.extraLess, { name: e.name })} className="grid size-7 place-items-center text-ink-muted hover:text-ink"><Minus className="size-3" /></button>
                    <button type="button" onClick={() => changeExtra(e, e.quantity + 1)} aria-label={fmt(t.extraMore, { name: e.name })} className="grid size-7 place-items-center text-ink-muted hover:text-ink"><Plus className="size-3" /></button>
                  </span>
                )}
                <span className="shrink-0 tabular-nums text-ink">{price(e.price * e.quantity)}</span>
                <button type="button" onClick={() => changeExtra(e, 0)} aria-label={fmt(t.removeExtra, { name: e.name })} className="grid size-7 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ivory-200 hover:text-ink">
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="inline-flex h-10 items-center rounded-md border border-line bg-white/70" role="group" aria-label={fmt(t.quantity, { name: snapshot.name })}>
            <button type="button" onClick={() => changeQuantity(item.quantity - 1)} aria-label={t.decrease} className="grid size-10 place-items-center text-ink-muted transition-colors hover:text-ink">
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-8 text-center text-sm font-semibold tabular-nums text-ink" aria-live="polite">{item.quantity}</span>
            <button type="button" onClick={() => changeQuantity(item.quantity + 1)} aria-label={t.increase} className="grid size-10 place-items-center text-ink-muted transition-colors hover:text-ink">
              <Plus className="size-3.5" />
            </button>
          </div>
          <button type="button" onClick={removeLine} className="inline-flex h-10 items-center text-[13px] text-ink-muted underline-offset-4 transition-colors hover:text-danger hover:underline">
            {t.remove}
          </button>
        </div>
      </div>
    </article>
  );
}
