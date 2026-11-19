"use client";
import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import type { CartItem, DeliveryZone } from "@/types";
import type { CartTotals } from "@/lib/pricing";
import { cn } from "@/lib/format";
import { SMALL_BUSINESS } from "@/lib/vat";
import { useI18n } from "@/i18n/client";

export interface SummaryProps {
  items: CartItem[];
  totals: CartTotals;
  zone: DeliveryZone | null;
  deliveryDate?: string;
  windowLabel?: string;
  greeting: { message: string; anonymous: boolean; senderName: string };
  cardsEnabled?: boolean;
  couponCode: string | null;
  couponError?: string;
  /** Where the bouquet goes – shown once the recipient step is filled in. */
  recipient?: { firstName: string; lastName: string; company?: string; street: string; houseNumber: string; addition?: string; zip: string; city: string };
}

function SummaryBody({ items, totals, zone, deliveryDate, windowLabel, greeting, cardsEnabled = false, couponCode, couponError, recipient }: SummaryProps) {
  const { m, fmt, price, dateShort } = useI18n();
  const t = m.checkout.summary;
  const vat = m.cart.vat[SMALL_BUSINESS ? "smallBusiness" : "standard"];
  const r = recipient;
  const hasAddress = Boolean(r && r.street.trim() && r.zip.trim());
  const cardText = cardsEnabled ? greeting.message.trim() : "";
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
                <p className="shrink-0 text-[14px] font-semibold tabular-nums text-ink">{price(item.snapshot.unitPrice * item.quantity)}</p>
              </div>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">{item.snapshot.sizeLabel}{item.snapshot.colorLabel ? ` · ${item.snapshot.colorLabel}` : ""}{item.quantity > 1 ? ` · ${item.quantity}×` : ""}</p>
              {item.extras.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {item.extras.map((e) => (
                    <li key={e.extraId} className="flex items-baseline justify-between gap-3 text-[12.5px] text-ink-muted">
                      <span className="truncate">+ {e.name}{e.quantity > 1 ? ` × ${e.quantity}` : ""}</span>
                      <span className="shrink-0 tabular-nums">{price(e.price * e.quantity)}</span>
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
          <dt className="text-ink-muted">{t.greetingCard}</dt>
          <dd className="max-w-[60%] text-right text-ink">
            {!cardsEnabled ? <span className="text-ink-soft">{t.comingSoon}</span> : cardText ? <span className="line-clamp-2 font-serif italic">„{cardText}“</span> : <span className="text-ink-soft">{t.noMessage}</span>}
            {cardText && <span className="block text-[12px] text-ink-muted">{greeting.anonymous ? t.anonymous : greeting.senderName.trim() ? `— ${greeting.senderName.trim()}` : ""}</span>}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">{t.delivery}</dt>
          <dd className="text-right text-ink">
            {deliveryDate ? dateShort(deliveryDate) : <span className="text-ink-soft">{t.dateFollows}</span>}
            {windowLabel && <span className="block text-[12px] text-ink-muted">{windowLabel}</span>}
            {zone && <span className="block text-[12px] text-ink-muted">{zone.region}</span>}
          </dd>
        </div>
        {hasAddress && r && (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">{t.address}</dt>
            <dd className="text-right text-ink">
              {[r.firstName, r.lastName].filter((x) => x.trim()).join(" ")}
              {r.company?.trim() && <span className="block text-[12px] text-ink-muted">{r.company}</span>}
              <span className="block text-[12px] text-ink-muted">{r.street} {r.houseNumber}{r.addition?.trim() ? `/${r.addition}` : ""}</span>
              <span className="block text-[12px] text-ink-muted">{r.zip} {r.city}</span>
            </dd>
          </div>
        )}
      </dl>

      <dl className="flex flex-col gap-2 border-t border-line pt-4 text-[14px]">
        <div className="flex justify-between"><dt className="text-ink-muted">{t.flowers}</dt><dd className="tabular-nums text-ink">{price(totals.itemsSubtotal)}</dd></div>
        {totals.extrasSubtotal > 0 && <div className="flex justify-between"><dt className="text-ink-muted">{t.extras}</dt><dd className="tabular-nums text-ink">{price(totals.extrasSubtotal)}</dd></div>}
        <div className="flex justify-between">
          <dt className="text-ink-muted">{totals.deliverySurcharge > 0 ? t.deliveryWithWindow : t.delivery}</dt>
          <dd className="tabular-nums text-ink">{zone ? (totals.delivery === 0 ? t.free : price(totals.delivery)) : <span className="text-ink-soft">{t.byPostalCode}</span>}</dd>
        </div>
        {zone && totals.missingForFreeDelivery !== null && totals.missingForFreeDelivery > 0 && (
          <div className="text-[12px] text-ink-muted"><dt className="sr-only">{t.note}</dt><dd>{fmt(t.missingForFreeDelivery, { amount: price(totals.missingForFreeDelivery) })}</dd></div>
        )}
        {couponCode && (
          <div className="flex justify-between">
            <dt className="text-ink-muted">{t.coupon} <span className="font-semibold text-ink">{couponCode}</span></dt>
            <dd className={cn("tabular-nums", couponError ? "text-danger" : "text-success")}>{couponError ? t.couponInvalid : totals.discount > 0 ? `– ${price(totals.discount)}` : t.freeDelivery}</dd>
          </div>
        )}
        {couponError && <div className="text-[12px] text-danger"><dt className="sr-only">{t.couponError}</dt><dd>{couponError}</dd></div>}
        <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3">
          <dt className="text-[15px] font-semibold text-ink">{t.total}</dt>
          <dd className="font-serif text-[26px] tabular-nums leading-none text-ink">{price(totals.total)}</dd>
        </div>
        <div className="text-[11.5px] text-ink-muted"><dt className="sr-only">{t.note}</dt><dd>{vat.note}</dd></div>
      </dl>
    </div>
  );
}

export function OrderSummary(props: SummaryProps) {
  const t = useI18n().m.checkout.summary;
  return (
    <aside aria-label={t.label} className="rounded-lg border border-line bg-ivory-100/70 p-5 sm:p-6">
      <h2 className="mb-4 font-serif text-2xl text-ink">{t.title}</h2>
      <SummaryBody {...props} />
    </aside>
  );
}

/** Mobile: collapsed bar with the total; expands to the full summary. */
export function CollapsibleSummary(props: SummaryProps) {
  const [open, setOpen] = useState(false);
  const { m, price } = useI18n();
  const t = m.checkout.summary;
  return (
    <section aria-label={t.label} className="rounded-lg border border-line bg-ivory-100/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="checkout-summary-panel"
        className="flex min-h-14 w-full items-center justify-between gap-3 px-5 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          {t.label}
          <ChevronDown className={cn("size-4 text-ink-muted transition-transform duration-300", open && "rotate-180")} aria-hidden />
        </span>
        <span className="font-serif text-[22px] tabular-nums text-ink">{price(props.totals.total)}</span>
      </button>
      <div id="checkout-summary-panel" hidden={!open} className="border-t border-line px-5 py-5">
        <SummaryBody {...props} />
      </div>
    </section>
  );
}
