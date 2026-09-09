"use client";
import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import type { DeliveryZone } from "@/types";
import type { DeliveryDay, LocalNow } from "@/lib/delivery";
import { addDays } from "@/lib/delivery";
import { cn, formatDateLong, formatDateShort, formatPrice } from "@/lib/format";
import { Textarea } from "@/components/ui/input";
import type { FieldErrors } from "@/lib/order-payload";
import { ChoicePill, ChoiceTile } from "./choice-tile";
import { fieldId, type CheckoutData } from "./checkout-state";

type Delivery = CheckoutData["delivery"];
const PILL_COUNT = 6;

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
  const availableSet = useMemo(() => new Set(days.map((d) => d.date)), [days]);
  const pills = days.slice(0, PILL_COUNT);
  const inPills = pills.some((d) => d.date === data.date);
  const [customOpen, setCustomOpen] = useState(() => Boolean(data.date) && !inPills);
  const showCustom = customOpen || (Boolean(data.date) && !inPills);
  const selectedDay = days.find((d) => d.date === data.date);
  const windows = selectedDay?.windows ?? [];
  const tomorrow = now ? addDays(now.date, 1) : null;

  const dayLabel = (d: DeliveryDay) => (now && d.date === now.date ? "Heute" : d.date === tomorrow ? "Morgen" : formatDateShort(d.date).replace(/\.$/, ""));
  const daySub = (d: DeliveryDay) => (now && d.date === now.date ? formatDateShort(d.date) : d.date === tomorrow ? formatDateShort(d.date) : undefined);

  const chooseDate = (date: string) => {
    const day = days.find((d) => d.date === date);
    const keepWindow = day?.windows.some((w) => w.id === data.windowId);
    set({ date, windowId: keepWindow ? data.windowId : "" });
  };

  if (!zone) {
    return (
      <p role="alert" className="rounded-md border border-line bg-ivory-100 p-4 text-[14px] text-ink-muted">
        Bitte gib zuerst eine Postleitzahl an, an die wir liefern können.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <fieldset>
        <legend className="mb-3 text-[13px] font-semibold text-ink">Lieferdatum</legend>
        {loading && days.length === 0 ? (
          <p className="text-[13px] text-ink-muted">Liefertage werden geladen …</p>
        ) : days.length === 0 ? (
          <p role="alert" className="text-[13px] text-danger">Für dieses Gebiet sind gerade keine Liefertage verfügbar.</p>
        ) : (
          <div id={id("date")} role="radiogroup" aria-label="Lieferdatum" aria-invalid={Boolean(errors.date) || undefined} aria-describedby={errors.date ? `${id("date")}-error` : undefined}>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-4">
              {pills.map((d) => (
                <ChoicePill key={d.date} name="delivery-date" value={d.date} checked={data.date === d.date} onChange={chooseDate} sub={daySub(d) ?? (d.sameDay ? "Same-Day" : undefined)}>
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
                <CalendarDays className="size-4" aria-hidden /> Anderes Datum
              </button>
            </div>
            {showCustom && (
              <div id={`${id("date")}-custom`} className="mt-3 flex flex-col gap-1.5 animate-fade-in">
                <label htmlFor={`${id("date")}-input`} className="text-[13px] font-semibold text-ink">Wunschdatum</label>
                <input
                  id={`${id("date")}-input`}
                  type="date"
                  min={days[0]?.date}
                  max={days[days.length - 1]?.date}
                  value={inPills ? "" : data.date}
                  onChange={(e) => chooseDate(e.target.value)}
                  onBlur={() => onBlur("date")}
                  className="h-12 w-full max-w-xs rounded-md border border-line bg-white/70 px-4 text-[15px] text-ink focus:border-forest focus:bg-white focus:outline-none"
                />
                <p className="text-[12.5px] text-ink-soft">
                  Liefertage: {zone.deliveryDays.map((d) => ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][d]).join(", ")} · bis {formatDateShort(days[days.length - 1]?.date ?? "")}
                </p>
              </div>
            )}
            {data.date && !availableSet.has(data.date) && !errors.date && (
              <p className="mt-2 text-[13px] text-danger">An diesem Tag liefern wir leider nicht.</p>
            )}
            {errors.date && <p id={`${id("date")}-error`} role="alert" className="mt-2 text-[13px] text-danger">{errors.date}</p>}
          </div>
        )}
        {selectedDay && (
          <p className="mt-3 text-[13px] text-ink-muted" aria-live="polite">
            Lieferung am <strong className="font-semibold text-ink">{formatDateLong(selectedDay.date)}</strong>
            {selectedDay.sameDay ? " – noch heute." : "."}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-[13px] font-semibold text-ink">Lieferzeitfenster</legend>
        {!selectedDay ? (
          <p className="text-[13px] text-ink-muted">Wähle zuerst ein Lieferdatum.</p>
        ) : (
          <div id={id("windowId")} role="radiogroup" aria-label="Lieferzeitfenster" aria-invalid={Boolean(errors.windowId) || undefined} className="flex flex-col gap-2">
            {windows.length === 0 ? (
              <ChoiceTile name="delivery-window" value="" checked onChange={() => set({ windowId: "" })} title="Kein bestimmtes Zeitfenster" description="Wir liefern im Laufe des Tages." />
            ) : (
              windows.map((w) => (
                <ChoiceTile
                  key={w.id} name="delivery-window" value={w.id} checked={data.windowId === w.id} onChange={(v) => set({ windowId: v })}
                  title={w.label}
                  description={w.surcharge > 0 ? `Aufpreis ${formatPrice(w.surcharge)}` : "Ohne Aufpreis"}
                  meta={w.surcharge > 0 ? `+ ${formatPrice(w.surcharge)}` : undefined}
                />
              ))
            )}
            {errors.windowId && <p role="alert" className="text-[13px] text-danger">{errors.windowId}</p>}
          </div>
        )}
      </fieldset>

      <Textarea
        id={id("note")} label="Hinweis für den Zusteller" optional
        placeholder="Bei Nachbar Top 4 abgeben, falls niemand öffnet."
        value={data.note} onChange={(e) => set({ note: e.target.value })} onBlur={() => onBlur("note")} error={errors.note}
        maxLength={300} rows={3} className="[&_textarea]:min-h-24"
      />
    </div>
  );
}
