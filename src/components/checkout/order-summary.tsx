"use client";
import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import type { CartItem, DeliveryZone } from "@/types";
import type { CartTotals } from "@/lib/pricing";
import { cn, formatDateShort, formatPrice } from "@/lib/format";

export interface SummaryProps {
  items: CartItem[];
  totals: CartTotals;
  zone: DeliveryZone | null;
  deliveryDate?: string;
  windowLabel?: string;
  greeting: { message: string; anonymous: boolean; senderName: string };
  couponCode: string | null;
  couponError?: string;
}

function SummaryBody({ items, totals, zone, deliveryDate, windowLabel, greeting, couponCode, couponError }: SummaryProps) {
  const cardText = greeting.message.trim();
  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col divide-y divide-line">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3.5 py-4 first:pt-0">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-ivory-200">
              {item.snapshot.image && <Image src={item.snapshot.image} alt="" fill sizes="64px" className="object-cover" />}
              {item.quantity > 1 && (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-forest text-[10px] font-bold text-ivory">{item.quantity}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate font-serif text-[19px] leading-tight text-ink">{item.snapshot.name}</p>
                <p className="shrink-0 text-[14px] font-semibold tabular-nums text-ink">{formatPrice(item.snapshot.unitPrice * item.quantity)}</p>
              </div>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">{item.snapshot.sizeLabel}{item.quantity > 1 ? ` · ${item.quantity}×` : ""}</p>
              {item.extras.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {item.extras.map((e) => (
                    <li key={e.extraId} className="flex items-baseline justify-between gap-3 text-[12.5px] text-ink-muted">
                      <span className="truncate">+ {e.name}{e.quantity > 1 ? ` × ${e.quantity}` : ""}</span>
                      <span className="shrink-0 tabular-nums">{formatPrice(e.price * e.quantity)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-2 border-t border-line pt-4 text-[13.5px]">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Grußkarte</dt>
          <dd className="max-w-[60%] text-right text-ink">
            {cardText ? <span className="line-clamp-2 font-serif italic">„{cardText}“</span> : <span className="text-ink-soft">Noch keine Nachricht</span>}
            {cardText && <span className="block text-[12px] text-ink-muted">{greeting.anonymous ? "Ohne Absender" : greeting.senderName.trim() ? `— ${greeting.senderName.trim()}` : ""}</span>}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Lieferung</dt>
          <dd className="text-right text-ink">
            {deliveryDate ? formatDateShort(deliveryDate) : <span className="text-ink-soft">Datum folgt</span>}
            {windowLabel && <span className="block text-[12px] text-ink-muted">{windowLabel}</span>}
            {zone && <span className="block text-[12px] text-ink-muted">{zone.name}</span>}
          </dd>
        </div>
      </dl>

      <dl className="flex flex-col gap-2 border-t border-line pt-4 text-[14px]">
        <div className="flex justify-between"><dt className="text-ink-muted">Blumen</dt><dd className="tabular-nums text-ink">{formatPrice(totals.itemsSubtotal)}</dd></div>
        {totals.extrasSubtotal > 0 && <div className="flex justify-between"><dt className="text-ink-muted">Extras</dt><dd className="tabular-nums text-ink">{formatPrice(totals.extrasSubtotal)}</dd></div>}
        <div className="flex justify-between">
          <dt className="text-ink-muted">Lieferung{totals.deliverySurcharge > 0 ? " inkl. Zeitfenster" : ""}</dt>
          <dd className="tabular-nums text-ink">{zone ? (totals.delivery === 0 ? "Gratis" : formatPrice(totals.delivery)) : <span className="text-ink-soft">nach PLZ</span>}</dd>
        </div>
        {zone && totals.missingForFreeDelivery !== null && totals.missingForFreeDelivery > 0 && (
          <p className="text-[12px] text-ink-soft">Noch {formatPrice(totals.missingForFreeDelivery)} bis zur Gratis-Lieferung.</p>
        )}
        {couponCode && (
          <div className="flex justify-between">
            <dt className="text-ink-muted">Gutschein <span className="font-semibold text-ink">{couponCode}</span></dt>
            <dd className={cn("tabular-nums", couponError ? "text-danger" : "text-success")}>{couponError ? "ungültig" : totals.discount > 0 ? `– ${formatPrice(totals.discount)}` : "Gratis-Lieferung"}</dd>
          </div>
        )}
        {couponError && <p className="text-[12px] text-danger">{couponError}</p>}
        <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3">
          <dt className="text-[15px] font-semibold text-ink">Gesamt</dt>
          <dd className="font-serif text-[26px] tabular-nums leading-none text-ink">{formatPrice(totals.total)}</dd>
        </div>
        <p className="text-[11.5px] text-ink-soft">inkl. MwSt.</p>
      </dl>
    </div>
  );
}

export function OrderSummary(props: SummaryProps) {
  return (
    <aside aria-label="Bestellübersicht" className="rounded-lg border border-line bg-ivory-100/70 p-5 sm:p-6">
      <h2 className="mb-4 font-serif text-2xl text-ink">Deine Bestellung</h2>
      <SummaryBody {...props} />
    </aside>
  );
}

/** Mobile: collapsed bar with the total; expands to the full summary. */
export function CollapsibleSummary(props: SummaryProps) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-label="Bestellübersicht" className="rounded-lg border border-line bg-ivory-100/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="checkout-summary-panel"
        className="flex min-h-14 w-full items-center justify-between gap-3 px-5 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          Bestellübersicht
          <ChevronDown className={cn("size-4 text-ink-muted transition-transform duration-300", open && "rotate-180")} aria-hidden />
        </span>
        <span className="font-serif text-[22px] tabular-nums text-ink">{formatPrice(props.totals.total)}</span>
      </button>
      <div id="checkout-summary-panel" hidden={!open} className="border-t border-line px-5 py-5">
        <SummaryBody {...props} />
      </div>
    </section>
  );
}
