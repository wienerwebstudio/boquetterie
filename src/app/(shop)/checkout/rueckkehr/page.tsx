import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentReturn } from "@/components/checkout/payment-return";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Zahlung wird bestätigt",
  robots: { index: false, follow: false },
};

/** Return URL for redirect-based Stripe payments (EPS, Klarna, 3-D Secure). */
export default function PaymentReturnPage() {
  return (
    <Suspense fallback={null}>
      <PaymentReturn />
    </Suspense>
  );
}
