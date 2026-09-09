import { cn } from "@/lib/format";

export function StarRating({ value, count, size = "sm", className, showValue }: { value: number; count?: number; size?: "sm" | "md"; className?: string; showValue?: boolean }) {
  const px = size === "sm" ? "size-3.5" : "size-4";
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} aria-label={`${value.toFixed(1)} von 5 Sternen`}>
      <span className="inline-flex gap-0.5 text-forest">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} viewBox="0 0 20 20" className={px} aria-hidden fill={i <= Math.round(value) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.2">
            <path d="M10 2.5l2.3 4.9 5.3.7-3.9 3.7.9 5.3L10 14.6l-4.7 2.5.9-5.3L2.4 8.1l5.3-.7z" strokeLinejoin="round" />
          </svg>
        ))}
      </span>
      {showValue && <span className="text-[13px] font-semibold text-ink">{value.toFixed(1)}</span>}
      {count !== undefined && <span className="text-[13px] text-ink-muted">({count})</span>}
    </span>
  );
}
