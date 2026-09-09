import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/format";

export function Price({ value, from, compareAt, className }: { value: number; from?: boolean; compareAt?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-2 font-sans tabular-nums", className)}>
      {from && <span className="text-[12px] font-medium text-ink-muted">ab</span>}
      <span className="font-semibold text-ink">{formatPrice(value)}</span>
      {compareAt && compareAt > value && <s className="text-[13px] text-ink-soft">{formatPrice(compareAt)}</s>}
    </span>
  );
}
