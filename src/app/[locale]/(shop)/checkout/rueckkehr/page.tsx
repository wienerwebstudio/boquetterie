import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentReturn } from "@/components/checkout/payment-return";
import { getI18n } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return {
    title: m.checkout.return.metaTitle,
    robots: { index: false, follow: false },
  };
}

/** Return URL for redirect-based Stripe payments (EPS, Klarna, 3-D Secure). */
export default function PaymentReturnPage() {
  return (
    <Suspense fallback={null}>
      <PaymentReturn />
    </Suspense>
  );
}
