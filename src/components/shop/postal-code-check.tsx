"use client";
import { useEffect, useState } from "react";
import { Check, MapPin, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeliveryCheck } from "@/hooks/use-delivery-check";
import { useDeliveryContext } from "@/store/delivery";
import { cn } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { normalizePostalCode, sameDayCutoffOn } from "@/lib/delivery";
import Link from "@/components/ui/link";
import { routes } from "@/lib/urls";

/**
 * Error text of a delivery check: a known error code from /api/delivery/check
 * (when the hook passes it on as `errorCode`) in the visitor's language,
 * otherwise the message the hook produced.
 */
export function deliveryErrorText(delivery: ReturnType<typeof useDeliveryCheck>, errors: Record<string, string>) {
  const code = "errorCode" in delivery && typeof delivery.errorCode === "string" ? delivery.errorCode : null;
  return (code && errors[code]) || delivery.error;
}

/**
 * The central "Wohin dürfen wir liefern?" widget. Used in the hero, the delivery page
 * and (compact) on product pages. Fully driven by admin delivery zones.
 */
export function PostalCodeCheck({
  title: titleProp, placeholder: placeholderProp, button: buttonProp,
  variant = "hero", productSlug, onResult, className,
}: {
  title?: string; placeholder?: string; button?: string; variant?: "hero" | "inline" | "compact";
  productSlug?: string; onResult?: (r: ReturnType<typeof useDeliveryCheck>["result"]) => void; className?: string;
}) {
  const { m, fmt, price, dateShort } = useI18n();
  const t = m.shop.postalCheck;
  const title = titleProp ?? t.title;
  const placeholder = placeholderProp ?? t.placeholder;
  const button = buttonProp ?? t.button;
  const ctx = useDeliveryContext();
  const [plzInput, setPlzInput] = useState<string | null>(null);
  const plz = plzInput ?? ctx.postalCode;
  const setPlz = setPlzInput;
  const delivery = useDeliveryCheck(productSlug);
  const { result, loading, check } = delivery;
  const error = deliveryErrorText(delivery, t.errors);

  useEffect(() => { if (result) onResult?.(result); }, [result, onResult]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await check(plz);
  };

  const firstDay = result?.days[0];
  const [nextBefore, nextAfter] = t.nextDelivery.split("{date}");
  const [expandingBefore, expandingAfter] = t.expanding.split("{link}");
  const isHero = variant === "hero";

  return (
    <div className={cn(isHero && "rounded-lg border border-white/60 bg-white/80 p-4 shadow-soft backdrop-blur-md sm:p-5", className)}>
      <form onSubmit={submit} className="flex flex-col gap-3" aria-label={t.formLabel}>
        <label htmlFor={`plz-${variant}`} className={cn("flex items-center gap-2 text-sm font-semibold text-ink", variant === "compact" && "text-[13px]")}>
          <MapPin className="size-4 text-forest" aria-hidden /> {title}
        </label>
        <div className="flex gap-2">
          <input
            id={`plz-${variant}`}
            inputMode="numeric"
            autoComplete="postal-code"
            pattern="[0-9]{4}"
            maxLength={4}
            value={plz}
            onChange={(e) => setPlz(normalizePostalCode(e.target.value))}
            placeholder={placeholder}
            aria-describedby={`plz-${variant}-status`}
            className="h-12 min-w-0 flex-1 rounded-md border border-line-strong bg-white px-4 text-[15px] tracking-[0.08em] text-ink placeholder:tracking-normal placeholder:text-ink-soft focus:border-forest focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-forest"
          />
          <Button type="submit" loading={loading} size="md" className="shrink-0">{button}</Button>
        </div>
      </form>
      <div id={`plz-${variant}-status`} aria-live="polite" className="mt-3 min-h-[1.25rem]">
        {error && <p className="text-[13px] text-danger">{error}</p>}
        {result && result.available && result.zone && (
          <div className="animate-fade-up">
            <p className="flex items-center gap-2 text-sm font-semibold text-success">
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-success text-ivory"><Check className="size-3" strokeWidth={3} /></span>
              {fmt(t.available, { plz: result.postalCode, region: result.zone.region })}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
              {result.sameDayToday && (
                <span className="inline-flex items-center gap-1 font-semibold text-forest"><Clock className="size-3.5" /> {fmt(t.sameDayToday, { time: result.now?.date ? sameDayCutoffOn(result.zone, result.now.date) : result.zone.sameDayCutoff })}</span>
              )}
              {!result.sameDayToday && firstDay && <span>{nextBefore}<strong className="text-ink">{dateShort(firstDay.date)}</strong>{nextAfter || null}</span>}
              <span>{fmt(t.fee, { fee: result.zone.fee === 0 ? t.free : result.zone.freeFrom !== null ? fmt(t.feeWithFreeFrom, { fee: price(result.zone.fee), freeFrom: price(result.zone.freeFrom) }) : price(result.zone.fee) })}</span>
            </div>
            {isHero && (
              <Link href={`${routes.shop}?plz=${result.postalCode}`} className="group mt-3 inline-flex items-center gap-2 text-sm font-semibold text-forest">
                {t.chooseDate}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            )}
          </div>
        )}
        {result && !result.available && (
          <div className="animate-fade-up text-[13px] text-ink-muted">
            <p className="font-semibold text-ink">{fmt(t.notAvailable, { plz: result.postalCode })}</p>
            <p className="mt-1">{expandingBefore}<Link href={routes.delivery} className="text-forest underline underline-offset-2">{t.deliveryLink}</Link>{expandingAfter || null}</p>
          </div>
        )}
      </div>
    </div>
  );
}
