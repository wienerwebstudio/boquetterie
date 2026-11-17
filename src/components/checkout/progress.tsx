"use client";
import { Check, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/format";
import { STEPS, type StepId } from "./checkout-state";

export function CheckoutProgress({ current, maxReached, onNavigate }: { current: StepId; maxReached: StepId; onNavigate: (step: StepId) => void }) {
  const currentStep = STEPS.find((s) => s.id === current)!;
  return (
    <nav aria-label="Bestellschritte" className="mb-8">
      {/* Mobile: compact – every reached step can be tapped, plus a back button */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-ink">
            <span className="text-ink-muted">Schritt {current} von {STEPS.length}</span> · {currentStep.label}
          </p>
          {current > 1 && (
            <button type="button" onClick={() => onNavigate((current - 1) as StepId)} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md px-2 text-[13px] font-semibold text-forest">
              <ChevronLeft className="size-4" aria-hidden /> Zurück
            </button>
          )}
        </div>
        <ol className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}>
          {STEPS.map((s) => {
            const active = s.id === current;
            const reachable = s.id <= maxReached && !active;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => reachable && onNavigate(s.id)}
                  disabled={!reachable}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Schritt ${s.id}: ${s.label}`}
                  className="flex h-6 w-full items-center disabled:cursor-default"
                >
                  <span className={cn("h-1 w-full rounded-full", s.id <= current ? "bg-forest" : s.id <= maxReached ? "bg-forest/40" : "bg-ivory-200")} aria-hidden />
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Desktop: labels */}
      <ol className="hidden items-center gap-2 lg:flex">
        {STEPS.map((s, i) => {
          const done = s.id < current;
          const active = s.id === current;
          const reachable = s.id <= maxReached && !active;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => reachable && onNavigate(s.id)}
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md px-2 text-[13px] font-semibold transition-colors",
                  active ? "text-forest" : done ? "text-ink hover:text-forest" : "text-ink-soft",
                  !reachable && "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border text-[11px] tabular-nums",
                    active ? "border-forest bg-forest text-ivory" : done ? "border-forest text-forest" : "border-line text-ink-soft",
                  )}
                  aria-hidden
                >
                  {done ? <Check className="size-3" strokeWidth={3} /> : s.id}
                </span>
                {s.label}
              </button>
              {i < STEPS.length - 1 && <span className={cn("h-px w-6 xl:w-10", s.id < current ? "bg-forest" : "bg-line")} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
