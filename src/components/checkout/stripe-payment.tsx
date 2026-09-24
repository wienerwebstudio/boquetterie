"use client";
import { useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Appearance, type Stripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { ArrowLeft, Lock } from "lucide-react";
import type { PaymentMethodId, PaymentConfirmResponse } from "@/types/payments";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";

/** One Stripe.js instance per publishable key for the lifetime of the page. */
const stripeInstances = new Map<string, Promise<Stripe | null>>();
function getStripe(publishableKey: string) {
  let p = stripeInstances.get(publishableKey);
  if (!p) {
    p = loadStripe(publishableKey);
    stripeInstances.set(publishableKey, p);
  }
  return p;
}

/** Ivory / forest look for the Payment Element. */
const appearance: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#1f3a2d",
    colorBackground: "#ffffff",
    colorText: "#1c1c1a",
    colorDanger: "#9f2c3b",
    borderRadius: "8px",
    fontFamily: "inherit",
  },
};

/** Puts the method the customer chose first inside the Payment Element. */
const PM_ORDER: Record<PaymentMethodId, string[]> = {
  card: ["card"],
  apple_pay: ["apple_pay", "card"],
  google_pay: ["google_pay", "card"],
  eps: ["eps"],
  klarna: ["klarna"],
  paypal: ["paypal"],
};

export interface StripeSession {
  orderId: string;
  token: string;
  clientSecret: string;
  method: PaymentMethodId;
}

export function StripePaymentForm({ publishableKey, session, amount, email, onDone, onCancel }: {
  publishableKey: string;
  session: StripeSession;
  amount: number;
  email: string;
  /** Called once Stripe reports success (or "processing") and the server has been informed. */
  onDone: (status: PaymentConfirmResponse["status"]) => void;
  onCancel: () => void;
}) {
  const stripePromise = useMemo(() => getStripe(publishableKey), [publishableKey]);
  const options: StripeElementsOptions = useMemo(() => ({ clientSecret: session.clientSecret, locale: "de", appearance }), [session.clientSecret]);
  return (
    <Elements stripe={stripePromise} options={options}>
      <StripeForm session={session} amount={amount} email={email} onDone={onDone} onCancel={onCancel} />
    </Elements>
  );
}

function StripeForm({ session, amount, email, onDone, onCancel }: {
  session: StripeSession; amount: number; email: string;
  onDone: (status: PaymentConfirmResponse["status"]) => void; onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    setError(null);
    const returnUrl = `${window.location.origin}/checkout/rueckkehr?orderId=${encodeURIComponent(session.orderId)}&token=${encodeURIComponent(session.token)}`;
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl, receipt_email: email || undefined },
      redirect: "if_required",
    });
    if (result.error) {
      setError(result.error.message ?? "Die Zahlung konnte nicht abgeschlossen werden. Bitte versuch es noch einmal.");
      setBusy(false);
      return;
    }
    // No redirect was needed (card, wallet): let the server verify the intent and mark the order paid.
    try {
      const res = await fetch("/api/payments/stripe/confirm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: session.orderId, token: session.token }),
      });
      const body = (await res.json()) as PaymentConfirmResponse;
      onDone(body.status ?? (result.paymentIntent?.status === "succeeded" ? "paid" : "pending"));
    } catch {
      // Stripe has the money; the webhook will settle the order. Show the status page anyway.
      onDone(result.paymentIntent?.status === "succeeded" ? "paid" : "pending");
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" aria-busy={busy}>
      <p className="text-[13.5px] leading-relaxed text-ink-muted">
        Bestellung <strong className="font-semibold text-ink">{session.orderId}</strong> ist angelegt. Schließe jetzt die Zahlung ab – erst danach wird sie verbindlich.
      </p>
      <div className="min-h-40">
        {!ready && <div className="flex flex-col gap-3" aria-hidden><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-2/3" /></div>}
        <div className={ready ? "" : "sr-only"}>
          <PaymentElement options={{ layout: "tabs", paymentMethodOrder: PM_ORDER[session.method] }} onReady={() => setReady(true)} />
        </div>
      </div>
      {error && <p role="alert" className="rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-ink">{error}</p>}
      <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" size="lg" icon={<ArrowLeft className="size-4" aria-hidden />} onClick={onCancel} disabled={busy}>
          Zurück
        </Button>
        <Button type="submit" size="xl" loading={busy} disabled={!ready || !stripe} className="sm:min-w-64">
          Jetzt bezahlen · {formatPrice(amount)}
        </Button>
      </div>
      <p className="flex items-start gap-2 text-[12.5px] text-ink-soft">
        <Lock className="mt-0.5 size-3.5 shrink-0 text-forest" aria-hidden />
        Die Zahlung wird sicher über Stripe abgewickelt. Zahlungsdaten werden nicht bei uns gespeichert.
      </p>
    </form>
  );
}
