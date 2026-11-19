"use client";
import { Lock } from "lucide-react";
import type { PaymentMethodConfig } from "@/types";
import type { PublicPaymentMethod } from "@/types/payments";
import { PaymentMark } from "@/components/icons/payment";
import { Skeleton } from "@/components/ui/skeleton";
import type { FieldErrors } from "@/lib/order-payload";
import { ChoiceTile } from "./choice-tile";
import { useI18n } from "@/i18n/client";
import { fieldId, type CheckoutData } from "./checkout-state";

type Payment = CheckoutData["payment"];

/** Method id → key of its description in `checkout.payment.descriptions`. */
const DESCRIPTION_KEYS = {
  apple_pay: "applePay",
  google_pay: "googlePay",
  card: "card",
  paypal: "paypal",
  klarna: "klarna",
  eps: "eps",
} as const satisfies Record<PaymentMethodConfig["id"], string>;

export function StepPayment({ data, set, errors, methods, loading, loadError }: {
  data: Payment;
  set: (patch: Partial<Payment>) => void;
  errors: FieldErrors;
  methods: PublicPaymentMethod[];
  loading: boolean;
  loadError?: string | null;
}) {
  const t = useI18n().m.checkout.payment;
  const selected = methods.find((m) => m.id === data.method);
  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-3 text-[13px] font-semibold text-ink">{t.method}</legend>
        {loading ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label={t.loading}><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
        ) : loadError ? (
          <p role="alert" className="text-[14px] text-danger">{loadError}</p>
        ) : methods.length === 0 ? (
          <p role="alert" className="text-[14px] text-danger">{t.none}</p>
        ) : (
          <div id={fieldId(5, "method")} role="radiogroup" aria-label={t.method} aria-invalid={Boolean(errors.method) || undefined} className="flex flex-col gap-2">
            {methods.map((m) => (
              <ChoiceTile
                key={m.id} name="payment-method" value={m.id} checked={data.method === m.id}
                onChange={(v) => set({ method: v as PaymentMethodConfig["id"] })}
                title={m.label}
                description={t.descriptions[DESCRIPTION_KEYS[m.id]]}
                meta={<PaymentMark id={m.id} />}
              />
            ))}
            {errors.method && <p role="alert" className="text-[13px] text-danger">{errors.method}</p>}
          </div>
        )}
      </fieldset>

      {selected?.provider === "mock" && (
        <p className="rounded-md border border-line bg-ivory-100 px-4 py-3 text-[13px] text-ink-muted">
          <strong className="font-semibold text-ink">{t.testModeTitle}</strong>{t.testModeText}
        </p>
      )}
      {selected?.provider === "stripe" && (
        <p className="text-[13px] text-ink-muted">{t.stripeHint}</p>
      )}

      <p className="flex items-start gap-2 text-[13px] text-ink-muted">
        <Lock className="mt-0.5 size-3.5 shrink-0 text-forest" aria-hidden />
        {t.secure}
      </p>
    </div>
  );
}
