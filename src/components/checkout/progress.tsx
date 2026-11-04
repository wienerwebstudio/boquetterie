"use client";
import { Check } from "lucide-react";
import { cn } from "@/lib/format";
import { STEPS, type StepId } from "./checkout-state";

export function CheckoutProgress({ current, maxReached, onNavigate }: { current: StepId; maxReached: StepId; onNavigate: (step: StepId) => void }) {
  const currentStep = STEPS.find((s) => s.id === current)!;
  return (
    <nav aria-label="Bestellschritte" className="mb-8">
      {/* Mobile: compact */}
      <div className="lg:hidden">
        <p className="text-[13px] font-semibold text-ink">
          <span className="text-ink-muted">Schritt {current} von {STEPS.length}</span> · {currentStep.label}
        </p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ivory-200" aria-hidden>
          <div className="h-full rounded-full bg-forest transition-[width] duration-500 ease-[var(--ease-soft)]" style={{ width: `${(current / STEPS.length) * 100}%` }} />
        </div>
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
