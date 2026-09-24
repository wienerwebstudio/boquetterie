"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";

/**
 * A radio option styled as a tile. Uses a real (visually hidden) radio input so
 * arrow keys, screen readers and form semantics work out of the box.
 */
export function ChoiceTile({
  name, value, checked, onChange, title, description, meta, icon, disabled, className, compact,
}: {
  name: string; value: string; checked: boolean; onChange: (value: string) => void;
  title: ReactNode; description?: ReactNode; meta?: ReactNode; icon?: ReactNode; disabled?: boolean; className?: string; compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 rounded-md border bg-white/70 transition-all duration-200",
        compact ? "min-h-12 px-3.5 py-2.5" : "min-h-14 px-4 py-3.5",
        checked ? "border-forest bg-white shadow-[0_0_0_1px_var(--color-forest)]" : "border-line hover:border-stone",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        type="radio" name={name} value={value} checked={checked} disabled={disabled}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <span
        aria-hidden
        className={cn("flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors", checked ? "border-forest" : "border-stone group-hover:border-ink-soft")}
      >
        <span className={cn("size-2 rounded-full bg-forest transition-transform", checked ? "scale-100" : "scale-0")} />
      </span>
      {icon && <span className="shrink-0 text-forest">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">{description}</span>}
      </span>
      {meta && <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">{meta}</span>}
    </label>
  );
}

/** A small pill radio (used for delivery dates). */
export function ChoicePill({
  name, value, checked, onChange, children, sub, className,
}: { name: string; value: string; checked: boolean; onChange: (value: string) => void; children: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <label
      className={cn(
        "flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-md border px-3 py-2 text-center transition-all duration-200",
        checked ? "border-forest bg-forest text-ivory" : "border-line bg-white/70 text-ink hover:border-stone",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest",
        className,
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="sr-only" />
      <span className="text-[14px] font-semibold leading-tight">{children}</span>
      {sub && <span className={cn("mt-0.5 text-[11.5px] leading-tight", checked ? "text-sand" : "text-ink-muted")}>{sub}</span>}
    </label>
  );
}
