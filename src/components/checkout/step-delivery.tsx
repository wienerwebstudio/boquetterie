"use client";
import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import type { DeliveryZone } from "@/types";
import type { DeliveryDay, LocalNow } from "@/lib/delivery";
import { addDays } from "@/lib/delivery";
import { cn } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { rich } from "./rich-text";
import { Textarea } from "@/components/ui/input";
import type { FieldErrors } from "@/lib/order-payload";
import { ChoicePill, ChoiceTile } from "./choice-tile";
import { fieldId, type CheckoutData } from "./checkout-state";

type Delivery = CheckoutData["delivery"];
const PILL_COUNT = 6;
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function StepDelivery({ data, set, errors, onBlur, days, now, zone, loading }: {
  data: Delivery;
  set: (patch: Partial<Delivery>) => void;
  errors: FieldErrors;
  onBlur: (field: keyof Delivery) => void;
  days: DeliveryDay[];
  now?: LocalNow;
  zone: DeliveryZone | null;
  loading: boolean;
}) {
  const id = (f: keyof Delivery) => fieldId(2, f);
  const { m, fmt, price, dateShort, dateLong } = useI18n();
  const t = m.checkout.delivery;
  const availableSet = useMemo(() => new Set(days.map((d) => d.date)), [days]);
  const pills = days.slice(0, PILL_COUNT);
  const inPills = pills.some((d) => d.date === data.date);
  const [customOpen, setCustomOpen] = useState(() => Boolean(data.date) && !inPills);
  const showCustom = customOpen || (Boolean(data.date) && !inPills);
  const selectedDay = days.find((d) => d.date === data.date);
  const windows = selectedDay?.windows ?? [];
  const tomorrow = now ? addDays(now.date, 1) : null;

  const dayLabel = (d: DeliveryDay) => (now && d.date === now.date ? t.today : d.date === tomorrow ? t.tomorrow : dateShort(d.date).replace(/\.$/, ""));
  const daySub = (d: DeliveryDay) => (now && d.date === now.date ? dateShort(d.date) : d.date === tomorrow ? dateShort(d.date) : undefined);

  const chooseDate = (date: string) => {
    const day = days.find((d) => d.date === date);
    const keepWindow = day?.windows.some((w) => w.id === data.windowId);
    set({ date, windowId: keepWindow ? data.windowId : "" });
  };

  if (!zone) {
    return (
      <p role="alert" className="rounded-md border border-line bg-ivory-100 p-4 text-[14px] text-ink-muted">
        {t.noZone}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <fieldset>
        <legend className="mb-3 text-[13px] font-semibold text-ink">{t.date}</legend>
        {loading && days.length === 0 ? (
          <p className="text-[13px] text-ink-muted">{t.loadingDays}</p>
        ) : days.length === 0 ? (
          <p role="alert" className="text-[13px] text-danger">{t.noDays}</p>
        ) : (
          <div id={id("date")} role="radiogroup" aria-label={t.date} aria-invalid={Boolean(errors.date) || undefined} aria-describedby={errors.date ? `${id("date")}-error` : undefined}>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-4">
              {pills.map((d) => (
                <ChoicePill key={d.date} name="delivery-date" value={d.date} checked={data.date === d.date} onChange={chooseDate} sub={daySub(d) ?? (d.sameDay ? t.sameDay : undefined)}>
                  {dayLabel(d)}
                </ChoicePill>
              ))}
              <button
                type="button"
                onClick={() => setCustomOpen(true)}
                aria-expanded={showCustom}
                aria-controls={`${id("date")}-custom`}
                className={cn(
                  "flex min-h-12 items-center justify-center gap-1.5 rounded-md border border-dashed px-3 text-[13px] font-semibold transition-colors",
                  showCustom ? "border-forest text-forest" : "border-stone text-ink-muted hover:border-forest hover:text-forest",
                )}
              >
                <CalendarDays className="size-4" aria-hidden /> {t.otherDate}
              </button>
            </div>
            {showCustom && (
              <div id={`${id("date")}-custom`} className="mt-3 flex flex-col gap-1.5 animate-fade-in">
                <label htmlFor={`${id("date")}-input`} className="text-[13px] font-semibold text-ink">{t.preferredDate}</label>
                <input
                  id={`${id("date")}-input`}
                  type="date"
                  min={days[0]?.date}
                  max={days[days.length - 1]?.date}
                  value={inPills ? "" : data.date}
                  onChange={(e) => chooseDate(e.target.value)}
                  onBlur={() => onBlur("date")}
                  className="h-12 w-full max-w-xs rounded-md border border-line-strong bg-white/70 px-4 text-[15px] text-ink focus:border-forest focus:bg-white focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-forest"
                />
                <p className="text-[12.5px] text-ink-soft">
                  {fmt(t.deliveryDays, { days: zone.deliveryDays.map((d) => m.checkout.weekdaysShort[WEEKDAY_KEYS[d]]).join(", "), date: dateShort(days[days.length - 1]?.date ?? "") })}
                </p>
              </div>
            )}
            {data.date && !availableSet.has(data.date) && !errors.date && (
              <p className="mt-2 text-[13px] text-danger">{t.dayUnavailable}</p>
            )}
            {errors.date && <p id={`${id("date")}-error`} role="alert" className="mt-2 text-[13px] text-danger">{errors.date}</p>}
          </div>
        )}
        {selectedDay && (
          <p className="mt-3 text-[13px] text-ink-muted" aria-live="polite">
            {rich(t.deliveryOn, { date: <strong className="font-semibold text-ink">{dateLong(selectedDay.date)}</strong> })}
            {selectedDay.sameDay ? t.sameDaySuffix : t.suffix}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-[13px] font-semibold text-ink">{t.window} {windows.length > 4 && <span className="font-normal text-ink-muted">{t.windowHourly}</span>}</legend>
        {!selectedDay ? (
          <p className="text-[13px] text-ink-muted">{t.chooseDateFirst}</p>
        ) : (
          <div id={id("windowId")} role="radiogroup" aria-label={t.window} aria-invalid={Boolean(errors.windowId) || undefined} className={windows.length > 4 ? "grid grid-cols-3 gap-2 sm:grid-cols-4" : "flex flex-col gap-2"}>
            {windows.length > 4 ? (
              windows.map((w) => (
                <ChoicePill key={w.id} name="delivery-window" value={w.id} checked={data.windowId === w.id} onChange={(v) => set({ windowId: v })} sub={w.surcharge > 0 ? `+ ${price(w.surcharge)}` : undefined}>
                  {w.label.replace(/ Uhr$/, "")}
                </ChoicePill>
              ))
            ) : windows.length === 0 ? (
              <ChoiceTile name="delivery-window" value="" checked onChange={() => set({ windowId: "" })} title={t.noWindowTitle} description={t.noWindowText} />
            ) : (
              windows.map((w) => (
                <ChoiceTile
                  key={w.id} name="delivery-window" value={w.id} checked={data.windowId === w.id} onChange={(v) => set({ windowId: v })}
                  title={w.label}
                  description={w.surcharge > 0 ? fmt(t.surcharge, { price: price(w.surcharge) }) : t.noSurcharge}
                  meta={w.surcharge > 0 ? `+ ${price(w.surcharge)}` : undefined}
                />
              ))
            )}
            {errors.windowId && <p role="alert" className="col-span-full text-[13px] text-danger">{errors.windowId}</p>}
          </div>
        )}
      </fieldset>

      <Textarea
        id={id("note")} label={t.note} optional
        placeholder={t.notePlaceholder}
        value={data.note} onChange={(e) => set({ note: e.target.value })} onBlur={() => onBlur("note")} error={errors.note}
        maxLength={300} rows={3} className="[&_textarea]:min-h-24"
      />
    </div>
  );
}
