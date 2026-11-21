import { Landmark } from "lucide-react";
import { siAmericanexpress, siApplepay, siGooglepay, siKlarna, siMastercard, siPaypal, siVisa, type SimpleIcon } from "simple-icons";
import type { PaymentMethodConfig } from "@/types";
import { cn } from "@/lib/format";

/** Brand mark from simple-icons (CC0 path data), used only to show an accepted payment method. */
function Brand({ icon, color, className }: { icon: SimpleIcon; color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={icon.title} className={cn("h-5 w-auto", className)}>
      <path d={icon.path} fill={color ?? `#${icon.hex}`} />
    </svg>
  );
}

const base = "inline-flex h-8 items-center gap-1.5 rounded-md border px-2";
/** Default look; brand marks with their own background pass `surface` instead (cn only joins classes – two bg-* would clash). */
const box = `${base} border-line bg-white`;

/** Payment method marks for the checkout: the brands customers look for. */
export function PaymentMark({ id, className }: { id: PaymentMethodConfig["id"]; className?: string }) {
  switch (id) {
    case "card":
      return (
        <span className={cn(box, className)}>
          <Brand icon={siVisa} className="h-5" />
          <Brand icon={siMastercard} className="h-5" />
          <Brand icon={siAmericanexpress} className="h-5" />
        </span>
      );
    case "apple_pay":
      return <span className={cn(base, "border-black bg-black", className)}><Brand icon={siApplepay} color="#ffffff" className="h-6" /></span>;
    case "google_pay":
      return <span className={cn(box, className)}><Brand icon={siGooglepay} className="h-6" /></span>;
    case "klarna":
      return <span className={cn(base, "border-[#FFB3C7] bg-[#FFB3C7]", className)}><Brand icon={siKlarna} color="#0b051d" className="h-4" /><span className="text-[12px] font-bold text-[#0b051d]">Klarna</span></span>;
    case "paypal":
      return <span className={cn(box, className)}><Brand icon={siPaypal} className="h-5" /></span>;
    case "eps":
      return <span className={cn(box, className)}><Landmark className="size-4 text-burgundy" aria-hidden /><span className="text-[12px] font-bold tracking-wide text-burgundy">eps</span></span>;
    default:
      return null;
  }
}
