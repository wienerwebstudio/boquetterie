import { Check } from "lucide-react";
import type { Order, OrderStatus, OrderStatusDefinition } from "@/types";
import { cn, formatDateTime } from "@/lib/format";

/**
 * Vertical status timeline for the customer. Shows every customer-visible step
 * of the happy path; done / current / upcoming are styled differently.
 * Negative terminal states are rendered by the page as an alert instead.
 */
export function OrderTimeline({ flow, definitions, status, history }: {
  flow: OrderStatus[];
  definitions: OrderStatusDefinition[];
  status: OrderStatus;
  history: Order["history"];
}) {
  const steps = flow
    .map((key) => definitions.find((d) => d.key === key))
    .filter((d): d is OrderStatusDefinition => Boolean(d && d.customerVisible));
  const currentIdx = steps.findIndex((s) => s.key === status);
  const at = (key: OrderStatus) => history.filter((h) => h.status === key).at(-1)?.at;

  return (
    <ol className="relative flex flex-col" aria-label="Status der Bestellung">
      {steps.map((s, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        const last = i === steps.length - 1;
        const when = done || current ? at(s.key) : undefined;
        return (
          <li key={s.key} className="relative flex gap-4 pb-7 last:pb-0" aria-current={current ? "step" : undefined}>
            {!last && <span className={cn("absolute left-[11px] top-6 h-[calc(100%-0.75rem)] w-px", done ? "bg-forest" : "bg-line")} aria-hidden />}
            <span
              className={cn(
                "relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border",
                done ? "border-forest bg-forest text-ivory" : current ? "border-forest bg-ivory text-forest" : "border-line bg-ivory text-ink-soft",
              )}
              aria-hidden
            >
              {done ? <Check className="size-3" strokeWidth={3} /> : <span className={cn("size-2 rounded-full", current ? "bg-forest" : "bg-line")} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("text-[15px] font-semibold", current ? "text-forest" : done ? "text-ink" : "text-ink-soft")}>
                {s.label}
                {current && <span className="ml-2 rounded-sm bg-forest/10 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-forest">Aktuell</span>}
              </p>
              <p className={cn("mt-0.5 text-[13.5px] leading-relaxed", done || current ? "text-ink-muted" : "text-ink-soft")}>{s.description}</p>
              {when && <p className="mt-1 text-[12px] tabular-nums text-ink-soft">{formatDateTime(when)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
