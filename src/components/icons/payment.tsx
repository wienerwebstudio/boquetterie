import type { PaymentMethodConfig } from "@/types";
import { cn } from "@/lib/format";

/** Neutral, brand-agnostic payment method marks (text-based to avoid trademark misuse). */
export function PaymentMark({ id, className }: { id: PaymentMethodConfig["id"]; className?: string }) {
  const label: Record<PaymentMethodConfig["id"], string> = {
    apple_pay: "Apple Pay", google_pay: "Google Pay", card: "Karte", paypal: "PayPal", klarna: "Klarna", eps: "EPS",
  };
  return (
    <span className={cn("inline-flex h-7 items-center rounded-sm border border-line bg-white px-2 text-[11px] font-semibold tracking-wide text-ink-muted", className)}>
      {id === "card" ? (
        <svg viewBox="0 0 24 16" className="mr-1 h-3.5 w-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="1" y="1.5" width="22" height="13" rx="2" /><path d="M1 6h22" /></svg>
      ) : null}
      {label[id]}
    </span>
  );
}
