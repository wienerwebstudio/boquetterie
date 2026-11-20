"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/ui/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/input";
import { StepPayment } from "@/components/checkout/step-payment";
import { usePaymentMethods } from "@/components/checkout/use-payment-methods";
import type { StripeSession } from "@/components/checkout/stripe-payment";
import { rich } from "@/components/checkout/rich-text";
import type { CheckoutData } from "@/components/checkout/checkout-state";
import type { FieldErrors } from "@/lib/order-payload";
import { routes } from "@/lib/urls";
import { useI18n, useLocalizedRouter } from "@/i18n/client";
import type { OfferPayResponse } from "@/types/offers";

// Stripe.js only loads once a Stripe payment really starts (as in the checkout).
const StripePaymentForm = dynamic(() => import("@/components/checkout/stripe-payment").then((m) => m.StripePaymentForm), { ssr: false });

/**
 * Payment box of an offer page: method choice (same list as the checkout), terms
 * checkbox and "Jetzt bezahlen". The server creates the order from the stored offer
 * (POST /api/offers/pay) – the browser never sends an amount. Then the usual flows:
 * mock → status page, Stripe → Payment Element, PayPal → redirect.
 */
export function OfferPayment({ token, total, email, name, cancelled }: { token: string; total: number; email: string; name: string; cancelled?: boolean }) {
  const { m, fmt, price } = useI18n();
  const t = m.offer;
  const router = useLocalizedRouter();
  const nextRouter = useRouter();
  const { data, loading, error: loadError } = usePaymentMethods();
  const methods = useMemo(() => data?.methods ?? [], [data]);
  const [method, setMethod] = useState<CheckoutData["payment"]["method"]>("");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(cancelled ? t.cancelledPayment : null);
  const [stripe, setStripe] = useState<StripeSession | null>(null);
  const selected = methods.find((x) => x.id === method);

  // "Angesehen": one beacon per page view from a real browser (link previews do not run scripts).
  useEffect(() => {
    try {
      void fetch("/api/offers/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }), keepalive: true }).catch(() => undefined);
    } catch { /* ignore */ }
  }, [token]);

  const statusPath = (id: string, orderToken: string) => `/bestellung/${encodeURIComponent(id)}?token=${encodeURIComponent(orderToken)}&neu=1`;

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const next: FieldErrors = {};
    if (!selected) next.method = m.checkout.validation.paymentMethod;
    if (!accepted) next.acceptedTerms = t.acceptTermsError;
    setErrors(next);
    if (Object.keys(next).length || !selected) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/offers/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, method: selected.id, acceptedTerms: true }) });
      const body = (await res.json()) as OfferPayResponse;
      if (!body.ok) {
        // Paid meanwhile or no longer valid: the page shows the current state.
        if (body.code === "paid" || body.code === "unavailable" || body.code === "not_found") { nextRouter.refresh(); return; }
        setMessage(t.failed);
        return;
      }
      if (body.payment.provider === "stripe" && body.payment.clientSecret && data?.stripePublishableKey) {
        setStripe({ orderId: body.id, token: body.token, clientSecret: body.payment.clientSecret, method: selected.id });
        return;
      }
      if (body.payment.provider === "paypal" && body.payment.approveUrl) {
        window.location.assign(body.payment.approveUrl);
        return;
      }
      router.push(statusPath(body.id, body.token));
    } catch {
      setMessage(m.checkout.errors.connection);
    } finally {
      setBusy(false);
    }
  };

  if (stripe && data?.stripePublishableKey) {
    return (
      <StripePaymentForm
        publishableKey={data.stripePublishableKey}
        session={stripe}
        amount={total}
        email={email}
        name={name}
        backPath={`/angebot/${token}?abgebrochen=1`}
        onDone={() => router.push(statusPath(stripe.orderId, stripe.token))}
        onCancel={() => { setStripe(null); setMessage(m.checkout.errors.notCompleted); }}
      />
    );
  }

  return (
    <form noValidate onSubmit={pay} className="flex flex-col gap-5" aria-busy={busy}>
      {message && <p role="alert" className="rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-ink">{message}</p>}
      <StepPayment data={{ method }} set={(p) => { if (p.method !== undefined) setMethod(p.method); setErrors((x) => ({ ...x, method: "" })); }} errors={errors} methods={methods} loading={loading} loadError={loadError} />
      <div className="flex flex-col gap-1.5 border-t border-line pt-5">
        <Checkbox
          id="offer-accept-terms"
          checked={accepted}
          onChange={(e) => { setAccepted(e.target.checked); if (e.target.checked) setErrors((x) => ({ ...x, acceptedTerms: "" })); }}
          aria-invalid={Boolean(errors.acceptedTerms) || undefined}
          aria-describedby={errors.acceptedTerms ? "offer-accept-terms-error" : undefined}
          label={rich(t.acceptTerms, {
            terms: <Link href={routes.legal.terms} target="_blank" rel="noreferrer" className="font-semibold text-forest underline underline-offset-2">{m.checkout.terms}</Link>,
            withdrawal: <Link href={routes.legal.withdrawal} target="_blank" rel="noreferrer" className="font-semibold text-forest underline underline-offset-2">{m.checkout.withdrawal}</Link>,
          })}
        />
        {errors.acceptedTerms && <p id="offer-accept-terms-error" role="alert" className="pl-7 text-[13px] text-danger">{errors.acceptedTerms}</p>}
        <p className="pl-7 text-[12.5px] leading-relaxed text-ink-soft">{m.checkout.noWithdrawalRight}</p>
      </div>
      <Button type="submit" size="xl" full loading={busy} disabled={loading || methods.length === 0}>
        {fmt(t.pay, { total: price(total) })}
      </Button>
      <p className="text-[12.5px] leading-relaxed text-ink-soft">
        {rich(m.checkout.legal, {
          terms: <Link href={routes.legal.terms} className="underline underline-offset-2">{m.checkout.terms}</Link>,
          withdrawal: <Link href={routes.legal.withdrawal} className="underline underline-offset-2">{m.checkout.withdrawal}</Link>,
        })}
      </p>
    </form>
  );
}
