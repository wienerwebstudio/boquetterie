"use client";
import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { isValidAustrianPostalCode, normalizePostalCode } from "@/lib/delivery";
import { cn } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import type { CartDeliveryState } from "./cart-delivery";

const fieldClass =
  "h-10 w-full rounded-md border border-line-strong bg-white/80 px-3 text-[14px] text-ink transition-colors focus:border-forest focus:bg-white focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-forest disabled:opacity-60";

/**
 * Notice + compact fields at the cart line when the delivery slot of the cart is not
 * complete: day expired / not offered any more, no day, no window, no or unserved PLZ.
 * Changes go straight into the cart items (all lines share one delivery).
 */
export function CartLineDelivery({ delivery }: { delivery: CartDeliveryState }) {
  const { m, dateShort } = useI18n();
  const t = m.cart.line;
  const x = m.pay.express;
  const uid = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const { visibleIssue: issue, days, windows, windowId, loading, checkError, takeAttention, attention } = delivery;
  const [zip, setZip] = useState(delivery.postalCode);
  const lastIssue = useRef(issue);

  // The wallet button was tapped with something missing: bring this line into view and focus its field.
  useEffect(() => {
    if (!issue || !takeAttention()) return;
    const box = boxRef.current;
    if (!box) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    box.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    box.querySelector<HTMLElement>("select, input")?.focus({ preventScroll: true });
  }, [issue, attention, takeAttention]);

  // Day picked → the window select replaces the day select: keep the focus in the box.
  useEffect(() => {
    const was = lastIssue.current;
    lastIssue.current = issue;
    if (issue === "window" && (was === "expired" || was === "date")) boxRef.current?.querySelector<HTMLElement>("select")?.focus();
  }, [issue]);

  if (!issue) return null;
  const urgent = issue === "expired" || issue === "zone" || (issue === "postalCode" && Boolean(checkError));
  const text = {
    expired: t.expired,
    date: t.chooseDate,
    window: t.chooseWindow,
    postalCode: checkError ?? x.needPostalCode,
    zone: x.errors.zone,
  }[issue];
  const noteId = `${uid}-note`;

  return (
    <div
      ref={boxRef}
      data-testid="cart-line-delivery"
      data-issue={issue}
      className={cn("mt-2 rounded-md border px-3 py-2.5", urgent ? "border-danger/30 bg-rose-100/50" : "border-line bg-white/60")}
    >
      <p id={noteId} key={attention} className={cn("flex items-start gap-1.5 text-[13px] leading-snug", urgent ? "text-ink" : "text-ink-muted", attention > 0 && "animate-fade-in")}>
        <AlertCircle className={cn("mt-px size-3.5 shrink-0", urgent ? "text-danger" : "text-forest")} aria-hidden />
        <span>{text}</span>
      </p>
      <div className="mt-2">
        {(issue === "postalCode" || issue === "zone") && (
          <>
            <label htmlFor={`${uid}-plz`} className="sr-only">{x.postalCode}</label>
            <input
              id={`${uid}-plz`} className={cn(fieldClass, "max-w-40")} inputMode="numeric" autoComplete="postal-code" maxLength={4}
              placeholder={x.postalCode} value={zip} aria-describedby={noteId} aria-invalid={urgent || undefined}
              onChange={(e) => {
                const next = normalizePostalCode(e.target.value);
                setZip(next);
                if (isValidAustrianPostalCode(next)) delivery.setPostalCode(next);
              }}
            />
          </>
        )}
        {(issue === "expired" || issue === "date") && (
          <CompactSelect
            id={`${uid}-day`} label={x.date} describedBy={noteId} value="" disabled={loading || days.length === 0}
            onChange={(v) => delivery.setDate(v)}
          >
            <option value="">{days.length ? t.chooseDate : x.noDays}</option>
            {days.map((d) => <option key={d.date} value={d.date}>{dateShort(d.date)}</option>)}
          </CompactSelect>
        )}
        {issue === "window" && (
          <CompactSelect id={`${uid}-window`} label={x.window} describedBy={noteId} value={windowId} onChange={(v) => delivery.setWindow(v)}>
            <option value="">{x.choose}</option>
            {windows.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
          </CompactSelect>
        )}
      </div>
    </div>
  );
}

function CompactSelect({ id, label, describedBy, value, disabled, onChange, children }: {
  id: string; label: string; describedBy: string; value: string; disabled?: boolean;
  onChange: (value: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <select id={id} value={value} disabled={disabled} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)} className={cn(fieldClass, "appearance-none pr-9")}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
    </div>
  );
}
