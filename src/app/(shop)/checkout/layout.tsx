import type { Metadata } from "next";
import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";
import { routes } from "@/lib/urls";

/**
 * The root layout already renders header and footer, so the checkout can't be
 * fully stripped down. Instead this layout adds a slim, calm top bar that keeps
 * the customer oriented (back to cart, "Sicher bezahlen") and marks the page as
 * not indexable.
 */
export const metadata: Metadata = {
  title: "Kasse",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-ivory">
      <div className="border-b border-line bg-ivory-100/60">
        <div className="container-x flex h-11 items-center justify-between text-[12.5px] sm:text-[13px]">
          <Link href={routes.cart} className="inline-flex items-center gap-1.5 font-semibold text-forest">
            <ArrowLeft className="size-3.5" aria-hidden /> Warenkorb
          </Link>
          <p className="inline-flex items-center gap-1.5 text-ink-muted">
            <Lock className="size-3.5 text-forest" aria-hidden /> Sicher bezahlen · SSL
          </p>
        </div>
      </div>
      <div className="container-x py-8 lg:py-12">{children}</div>
    </div>
  );
}
