"use client";
import Link from "@/components/ui/link";
import { Lock, ShieldCheck, Fingerprint, ArrowRight } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { useCart, cartCount } from "@/store/cart";
import { useUi } from "@/store/ui";
import { routes } from "@/lib/urls";
import { CartLine } from "./cart-line";
import { CartSurprise } from "./cart-surprise";
import { CartUpsell } from "./cart-upsell";
import { CartSummary } from "./cart-summary";
import { useCartTotals } from "./use-cart-totals";
import { SMALL_BUSINESS } from "@/lib/vat";
import { useI18n } from "@/i18n/client";
import { ExpressBuy } from "@/components/checkout/express-buy";
import { ordersPaused } from "@/lib/orders-paused";

export function CartTrustRow({ className }: { className?: string }) {
  const { m } = useI18n();
  const hints = [
    { icon: Lock, label: m.cart.trust.securePayment },
    { icon: ShieldCheck, label: m.cart.trust.ssl },
    { icon: Fingerprint, label: m.cart.trust.privacy },
  ];
  return (
    <ul className={className ?? "flex items-center justify-center gap-4 text-[11.5px] text-ink-muted"}>
      {hints.map(({ icon: Icon, label }) => (
        <li key={label} className="inline-flex items-center gap-1.5"><Icon className="size-3.5" strokeWidth={1.5} aria-hidden />{label}</li>
      ))}
    </ul>
  );
}

export function CartEmpty({ onClose, cardsEnabled = false }: { onClose?: () => void; cardsEnabled?: boolean }) {
  const { m } = useI18n();
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
      <p className="eyebrow">{m.cart.empty.eyebrow}</p>
      <p className="mt-3 font-serif text-3xl text-ink">{m.cart.empty.title}</p>
      <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-ink-muted">
        {cardsEnabled ? m.cart.empty.textWithCards : m.cart.empty.text}
      </p>
      <Link href={routes.shop} onClick={onClose} className="mt-8 inline-flex h-13 items-center justify-center gap-2 rounded-md bg-forest px-7 text-[15px] font-semibold tracking-wide text-ivory transition-colors hover:bg-forest-700">
        {m.cart.empty.cta} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

function DrawerFooter({ onClose }: { onClose: () => void }) {
  const { totals, zone } = useCartTotals();
  const { m, fmt, price } = useI18n();
  const vat = m.cart.vat[SMALL_BUSINESS ? "smallBusiness" : "standard"];
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[14px] font-semibold text-ink">{m.cart.drawer.total}</span>
        <span className="text-right">
          <span className="text-[19px] font-semibold tabular-nums text-ink">{price(totals.total)}</span>
          <span className="block text-[11.5px] text-ink-muted">{fmt(zone ? m.cart.drawer.inclDelivery : m.cart.drawer.plusDelivery, { vat: vat.short })}</span>
        </span>
      </div>
      <Link href={routes.checkout} onClick={onClose} className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-forest px-8 text-base font-semibold tracking-wide text-ivory transition-colors hover:bg-forest-700">
        <Lock className="size-4" aria-hidden /> {m.cart.checkout}
      </Link>
      <CartTrustRow />
    </div>
  );
}

export function CartDrawer({ cardsEnabled = false }: { cardsEnabled?: boolean }) {
  const cartOpen = useUi((s) => s.cartOpen);
  const closeCart = useUi((s) => s.closeCart);
  const hydrated = useCart((s) => s.hydrated);
  const items = useCart((s) => s.items);
  const coupon = useCart((s) => s.coupon);
  const { m, fmt, plural } = useI18n();
  if (!hydrated) return null;
  const count = cartCount(items);
  const countLabel = plural(count, m.cart.items);

  return (
    <Drawer
      open={cartOpen}
      onClose={closeCart}
      labelledBy="cart-drawer-title"
      title={<span>{m.cart.title} {count > 0 && <span className="ml-1 font-sans text-[13px] text-ink-muted">({countLabel})</span>}</span>}
      footer={items.length ? <DrawerFooter onClose={closeCart} /> : undefined}
    >
      <p className="sr-only" aria-live="polite">{fmt(m.cart.liveCount, { count: countLabel })}</p>
      {items.length === 0 ? (
        <CartEmpty onClose={closeCart} cardsEnabled={cardsEnabled} />
      ) : (
        <div className="space-y-7 px-5 py-5 sm:px-6">
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="py-5 first:pt-0"><CartLine item={item} /></li>
            ))}
          </ul>
          <CartSurprise items={items} cardsEnabled={cardsEnabled} />
          <CartUpsell items={items} />
          <div className="border-t border-line pt-5">
            <CartSummary showTotal={false} />
          </div>
          {/* Express purchase in the scrollable body – the footer stays compact on phones. */}
          {!ordersPaused() && <ExpressBuy items={items} couponCode={coupon} source="cart" />}
        </div>
      )}
    </Drawer>
  );
}
