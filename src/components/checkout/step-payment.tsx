"use client";
import { Lock } from "lucide-react";
import type { PaymentMethodConfig } from "@/types";
import type { PublicPaymentMethod } from "@/types/payments";
import { PaymentMark } from "@/components/icons/payment";
import { Skeleton } from "@/components/ui/skeleton";
import type { FieldErrors } from "@/lib/order-payload";
import { ChoiceTile } from "./choice-tile";
import { fieldId, type CheckoutData } from "./checkout-state";

type Payment = CheckoutData["payment"];

const DESCRIPTIONS: Record<PaymentMethodConfig["id"], string> = {
  apple_pay: "Verfügbarkeit wird beim Bezahlen geprüft (Safari / Apple-Gerät).",
  google_pay: "Verfügbarkeit wird beim Bezahlen geprüft.",
  card: "Visa, Mastercard, American Express.",
  paypal: "Du wirst zu PayPal weitergeleitet.",
  klarna: "Rechnung oder Ratenkauf über Klarna.",
  eps: "Online-Überweisung mit deiner österreichischen Bank.",
};

export function StepPayment({ data, set, errors, methods, loading, loadError }: {
  data: Payment;
  set: (patch: Partial<Payment>) => void;
  errors: FieldErrors;
  methods: PublicPaymentMethod[];
  loading: boolean;
  loadError?: string | null;
}) {
  const selected = methods.find((m) => m.id === data.method);
  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-3 text-[13px] font-semibold text-ink">Zahlungsart</legend>
        {loading ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Zahlungsarten werden geladen"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
        ) : loadError ? (
          <p role="alert" className="text-[14px] text-danger">{loadError}</p>
        ) : methods.length === 0 ? (
          <p role="alert" className="text-[14px] text-danger">Derzeit ist keine Zahlungsart verfügbar. Bitte kontaktiere uns.</p>
        ) : (
          <div id={fieldId(5, "method")} role="radiogroup" aria-label="Zahlungsart" aria-invalid={Boolean(errors.method) || undefined} className="flex flex-col gap-2">
            {methods.map((m) => (
              <ChoiceTile
                key={m.id} name="payment-method" value={m.id} checked={data.method === m.id}
                onChange={(v) => set({ method: v as PaymentMethodConfig["id"] })}
                title={m.label}
                description={DESCRIPTIONS[m.id]}
                meta={<PaymentMark id={m.id} />}
              />
            ))}
            {errors.method && <p role="alert" className="text-[13px] text-danger">{errors.method}</p>}
          </div>
        )}
      </fieldset>

      {selected?.provider === "mock" && (
        <p className="rounded-md border border-line bg-ivory-100 px-4 py-3 text-[13px] text-ink-muted">
          <strong className="font-semibold text-ink">Testmodus.</strong> Die Zahlung wird simuliert – es wird kein Betrag abgebucht.
        </p>
      )}
      {selected?.provider === "stripe" && (
        <p className="text-[13px] text-ink-muted">Nach „Jetzt kaufen“ gibst du deine Zahlungsdaten sicher bei Stripe ein.</p>
      )}

      <p className="flex items-start gap-2 text-[13px] text-ink-muted">
        <Lock className="mt-0.5 size-3.5 shrink-0 text-forest" aria-hidden />
        Deine Daten werden SSL-verschlüsselt übertragen. Zahlungsdaten werden nicht bei uns gespeichert.
      </p>
    </div>
  );
}
