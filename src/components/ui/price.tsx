"use client";
import { cn } from "@/lib/format";
import { useI18n } from "@/i18n/client";

export function Price({ value, from, compareAt, className }: { value: number; from?: boolean; compareAt?: number; className?: string }) {
  const { m, price } = useI18n();
  return (
    <span className={cn("inline-flex items-baseline gap-2 font-sans tabular-nums", className)}>
      {from && <span className="text-[12px] font-medium text-ink-muted">{m.ui.priceFromPrefix}</span>}
      <span className="font-semibold text-ink">{price(value)}</span>
      {compareAt && compareAt > value && <s className="text-[13px] text-ink-muted">{price(compareAt)}</s>}
    </span>
  );
}
