"use client";
import { useId, useState } from "react";
import { Tag, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, cn } from "@/lib/format";
import { useCartTotals } from "./use-cart-totals";

function Row({ label, value, muted, strong }: { label: React.ReactNode; value: React.ReactNode; muted?: boolean; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 text-[14px]", strong ? "text-ink" : "text-ink-muted")}>
      <dt className={cn(strong && "font-semibold")}>{label}</dt>
      <dd className={cn("tabular-nums", strong ? "text-[17px] font-semibold" : muted ? "text-ink-soft" : "text-ink")}>{value}</dd>
    </div>
  );
}

/**
 * Totals + coupon. Delivery is quoted from the PLZ context when known,
 * otherwise it is settled in checkout.
 */
export function CartSummary({ className, showTotal = true }: { className?: string; showTotal?: boolean }) {
  const { totals, zone, coupon, couponError, applying, apply, remove } = useCartTotals();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const inputId = useId();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await apply(code);
    if (ok) { setCode(""); setOpen(false); }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <dl className="space-y-2">
        <Row label="Sträuße" value={formatPrice(totals.itemsSubtotal)} />
        {totals.extrasSubtotal > 0 && <Row label="Extras" value={formatPrice(totals.extrasSubtotal)} />}
        {zone ? (
          <Row label={<>Lieferung <span className="text-ink-soft">· {zone.name}</span></>} value={totals.delivery === 0 ? <span className="font-semibold text-success">Gratis</span> : formatPrice(totals.delivery)} />
        ) : (
          <Row label="Lieferung" value="wird im Checkout berechnet" muted />
        )}
        {coupon && totals.discount > 0 && (
          <Row label={<>Rabatt <span className="text-ink-soft">· {coupon.code}</span></>} value={<span className="text-success">− {formatPrice(totals.discount)}</span>} />
        )}
        {showTotal && (
          <div className="border-t border-line pt-3">
            <Row label={<>Gesamt <span className="text-[12px] font-normal text-ink-soft">inkl. MwSt.</span></>} value={formatPrice(totals.total)} strong />
          </div>
        )}
      </dl>

      {zone && totals.missingForFreeDelivery !== null && totals.missingForFreeDelivery > 0 && (
        <p className="rounded-md bg-ivory-100 px-3 py-2 text-[13px] text-ink-muted">
          Noch <span className="font-semibold text-ink">{formatPrice(totals.missingForFreeDelivery)}</span> bis zur kostenlosen Lieferung.
        </p>
      )}
      {zone && totals.belowMinOrder && (
        <p className="rounded-md bg-ivory-100 px-3 py-2 text-[13px] text-ink-muted">
          Für {zone.name} gilt ein Mindestbestellwert von <span className="font-semibold text-ink">{formatPrice(totals.minOrder)}</span>.
        </p>
      )}

      {/* Coupon */}
      <div aria-live="polite">
        {coupon ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-white/70 px-3 py-2.5 text-[13.5px]">
            <span className="inline-flex items-center gap-2 text-ink">
              <Check className="size-4 text-success" aria-hidden />
              <span className="font-semibold tracking-[0.06em]">{coupon.code}</span>
              {coupon.description && <span className="hidden text-ink-muted sm:inline">· {coupon.description}</span>}
            </span>
            <button type="button" onClick={remove} aria-label="Gutschein entfernen" className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-ivory-200 hover:text-ink"><X className="size-4" /></button>
          </div>
        ) : open ? (
          <form onSubmit={submit} className="space-y-2">
            <label htmlFor={inputId} className="sr-only">Gutscheincode</label>
            <div className="flex gap-2">
              <input
                id={inputId}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Gutscheincode"
                autoComplete="off"
                autoCapitalize="characters"
                autoFocus
                aria-describedby={couponError ? `${inputId}-error` : undefined}
                aria-invalid={couponError ? true : undefined}
                className={cn("h-11 min-w-0 flex-1 rounded-md border bg-white px-3 text-[14px] uppercase tracking-[0.08em] text-ink placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-soft focus:border-forest focus:outline-none", couponError ? "border-danger" : "border-line")}
              />
              <Button type="submit" variant="outline" size="md" loading={applying}>Einlösen</Button>
            </div>
            {couponError && <p id={`${inputId}-error`} className="text-[13px] text-danger">{couponError}</p>}
          </form>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest underline-offset-4 hover:underline">
            <Tag className="size-3.5" aria-hidden /> Gutscheincode?
          </button>
        )}
        {!coupon && !open && couponError && <p className="mt-1 text-[13px] text-danger">{couponError}</p>}
      </div>
    </div>
  );
}
