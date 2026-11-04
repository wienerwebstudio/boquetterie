"use client";
import Link from "next/link";
import { Lock, ShieldCheck, Fingerprint, ArrowRight } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { useCart, cartCount } from "@/store/cart";
import { useUi } from "@/store/ui";
import { routes } from "@/lib/urls";
import { formatPrice, pluralize } from "@/lib/format";
import { CartLine } from "./cart-line";
import { CartSurprise } from "./cart-surprise";
import { CartUpsell } from "./cart-upsell";
import { CartSummary } from "./cart-summary";
import { useCartTotals } from "./use-cart-totals";

export function CartTrustRow({ className }: { className?: string }) {
  const hints = [
    { icon: Lock, label: "Sichere Zahlung" },
    { icon: ShieldCheck, label: "SSL-verschlüsselt" },
    { icon: Fingerprint, label: "Datenschutz" },
  ];
  return (
    <ul className={className ?? "flex items-center justify-center gap-4 text-[11.5px] text-ink-muted"}>
      {hints.map(({ icon: Icon, label }) => (
        <li key={label} className="inline-flex items-center gap-1.5"><Icon className="size-3.5" strokeWidth={1.5} aria-hidden />{label}</li>
      ))}
    </ul>
  );
}

export function CartEmpty({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
      <p className="eyebrow">Dein Warenkorb</p>
      <p className="mt-3 font-serif text-3xl text-ink">Noch ganz leer.</p>
      <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-ink-muted">
        Frisch gebundene Sträuße, Wunschdatum und eine persönliche Karte – alles wartet nur auf dich.
      </p>
      <Link href={routes.shop} onClick={onClose} className="mt-8 inline-flex h-13 items-center justify-center gap-2 rounded-md bg-forest px-7 text-[15px] font-semibold tracking-wide text-ivory transition-colors hover:bg-forest-700">
        Blumen entdecken <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

function DrawerFooter({ onClose }: { onClose: () => void }) {
  const { totals, zone } = useCartTotals();
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[14px] font-semibold text-ink">Gesamt</span>
        <span className="text-right">
          <span className="text-[19px] font-semibold tabular-nums text-ink">{formatPrice(totals.total)}</span>
          <span className="block text-[11.5px] text-ink-muted">{zone ? "inkl. Lieferung & MwSt." : "inkl. MwSt. · zzgl. Lieferung"}</span>
        </span>
      </div>
      <Link href={routes.checkout} onClick={onClose} className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-forest px-8 text-base font-semibold tracking-wide text-ivory transition-colors hover:bg-forest-700">
        <Lock className="size-4" aria-hidden /> Sicher zur Kasse
      </Link>
      <CartTrustRow />
    </div>
  );
}

export function CartDrawer() {
  const cartOpen = useUi((s) => s.cartOpen);
  const closeCart = useUi((s) => s.closeCart);
  const hydrated = useCart((s) => s.hydrated);
  const items = useCart((s) => s.items);
  if (!hydrated) return null;
  const count = cartCount(items);

  return (
    <Drawer
      open={cartOpen}
      onClose={closeCart}
      labelledBy="cart-drawer-title"
      title={<span>Warenkorb {count > 0 && <span className="ml-1 font-sans text-[13px] text-ink-muted">({pluralize(count, "Artikel", "Artikel")})</span>}</span>}
      footer={items.length ? <DrawerFooter onClose={closeCart} /> : undefined}
    >
      <p className="sr-only" aria-live="polite">Warenkorb: {pluralize(count, "Artikel", "Artikel")}</p>
      {items.length === 0 ? (
        <CartEmpty onClose={closeCart} />
      ) : (
        <div className="space-y-7 px-5 py-5 sm:px-6">
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="py-5 first:pt-0"><CartLine item={item} /></li>
            ))}
          </ul>
          <CartSurprise items={items} />
          <CartUpsell items={items} />
          <div className="border-t border-line pt-5">
            <CartSummary showTotal={false} />
          </div>
        </div>
      )}
    </Drawer>
  );
}
