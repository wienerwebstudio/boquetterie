import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { Lock, ArrowLeft } from "lucide-react";
import { routes } from "@/lib/urls";
import { getI18n } from "@/i18n/server";
import { ClientMessages } from "@/i18n/scope";

/**
 * The root layout already renders header and footer, so the checkout can't be
 * fully stripped down. Instead this layout adds a slim, calm top bar that keeps
 * the customer oriented (back to cart, "Sicher bezahlen") and marks the page as
 * not indexable.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return {
    title: m.checkout.metaTitle,
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const { m } = await getI18n();
  return (
    <ClientMessages ns={["checkout"]}>
    <div className="bg-ivory">
      <div className="border-b border-line bg-ivory-100/60">
        <div className="container-x flex h-11 items-center justify-between text-[12.5px] sm:text-[13px]">
          <Link href={routes.cart} className="inline-flex items-center gap-1.5 font-semibold text-forest">
            <ArrowLeft className="size-3.5" aria-hidden /> {m.checkout.topBar.backToCart}
          </Link>
          <p className="inline-flex items-center gap-1.5 text-ink-muted">
            <Lock className="size-3.5 text-forest" aria-hidden /> {m.checkout.topBar.secure}
          </p>
        </div>
      </div>
      <div className="container-x py-8 lg:py-12">{children}</div>
    </div>
    </ClientMessages>
  );
}
