"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/ui/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/input";
import { StepPayment } from "@/components/checkout/step-payment";
import { usePaymentMethods } from "@/components/checkout/use-payment-methods";
import type { StripeInlineHandle } from "@/components/checkout/stripe-inline";
import { amountChanged, displayCents, statusPath } from "@/components/checkout/pay-logic";
import { rich } from "@/components/checkout/rich-text";
import type { CheckoutData } from "@/components/checkout/checkout-state";
import type { FieldErrors } from "@/lib/order-payload";
import { routes } from "@/lib/urls";
import { useI18n, useLocalizedRouter } from "@/i18n/client";
import type { OfferPayResponse } from "@/types/offers";
import { currentVisit } from "@/components/analytics/visit";

// Stripe.js only loads once a Stripe method is selected (as in the checkout).
const StripeInline = dynamic(() => import("@/components/checkout/stripe-inline").then((m) => m.StripeInline), { ssr: false });

/**
 * Payment box of an offer page: method choice (same list as the checkout) with the Stripe
 * Payment Element inline under the selected method, terms checkbox and "Jetzt bezahlen" –
 * one step. The server creates the order from the stored offer (POST /api/offers/pay) – the
 * browser never sends an amount – and reuses an open order/PaymentIntent on a retry. Then:
 * mock → status page, Stripe → confirm the inline element, PayPal → redirect.
 */
export function OfferPayment({ token, total, email, name, cancelled }: { token: string; total: number; email: string; name: string; cancelled?: boolean }) {
  const { m, fmt, price, href } = useI18n();
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
  const [stripeHandle, setStripeHandle] = useState<StripeInlineHandle | null>(null);
  /** Server amount once an order exists (differs from `total` only if the offer was edited meanwhile). */
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [classicSecret, setClassicSecret] = useState<string | null>(null);
  const selected = methods.find((x) => x.id === method);
  const shownTotal = serverTotal ?? total;

  // "Angesehen": one beacon per page view from a real browser (link previews do not run scripts).
  useEffect(() => {
    try {
      void fetch("/api/offers/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }), keepalive: true }).catch(() => undefined);
    } catch { /* ignore */ }
  }, [token]);

  const report = useCallback((order: { id: string; token: string }, kind: "confirm_error", msg?: string) => {
    void import("@/components/checkout/stripe-shared").then((x) => x.reportPaymentProblem({ orderId: order.id, token: order.token, method }, kind, msg)).catch(() => undefined);
  }, [method]);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const next: FieldErrors = {};
    if (!selected) next.method = m.checkout.validation.paymentMethod;
    if (!accepted) next.acceptedTerms = t.acceptTermsError;
    setErrors(next);
    if (Object.keys(next).length || !selected) return;
    const isStripe = selected.provider === "stripe";
    const handle = stripeHandle;
    if (isStripe && (!data?.stripePublishableKey || !handle)) { setMessage(m.pay.inline.loadFailed); return; }
    // Wallets need the click as user gesture: Stripe's submit() starts before anything is awaited.
    const submitted = isStripe && handle ? handle.submit() : null;
    setBusy(true);
    setMessage(null);
    try {
      if (submitted) {
        const checked = await submitted;
        if (checked.error) { setMessage(checked.error.message ?? t.failed); return; }
      }
      const res = await fetch("/api/offers/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, method: selected.id, acceptedTerms: true, analytics: currentVisit() }) });
      const body = (await res.json()) as OfferPayResponse;
      if (!body.ok) {
        // Paid meanwhile or no longer valid: the page shows the current state.
        if (body.code === "paid" || body.code === "unavailable" || body.code === "not_found") { nextRouter.refresh(); return; }
        setMessage(t.failed);
        return;
      }
      const order = { id: body.id, token: body.token };
      if (body.payment.provider === "stripe") {
        if (body.payment.status === "paid" || !body.payment.clientSecret || !handle) { router.push(statusPath(order.id, order.token)); return; }
        const amount = typeof body.total === "number" ? body.total : shownTotal;
        if (amountChanged(amount, displayCents(shownTotal))) {
          setServerTotal(amount);
          setMessage(fmt(m.pay.inline.amountChanged, { total: price(amount) }));
          return;
        }
        const back = `/angebot/${token}?abgebrochen=1`;
        const returnUrl = `${window.location.origin}${href("/checkout/rueckkehr")}?orderId=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.token)}&back=${encodeURIComponent(back)}`;
        const result = await handle.confirm({ clientSecret: body.payment.clientSecret, returnUrl, email });
        if (result.error) {
          if (result.error.type !== "validation_error") report(order, "confirm_error", [result.error.type, result.error.code, result.error.decline_code, result.error.message].filter(Boolean).join(" · "));
          if (!handle.classic && result.error.type === "invalid_request_error") {
            setClassicSecret(body.payment.clientSecret);
            setMessage(m.pay.inline.retry);
            return;
          }
          setMessage(fmt(m.pay.inline.failed, { reason: result.error.message ?? "", orderId: order.id }));
          return;
        }
        try {
          await fetch("/api/payments/stripe/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, token: order.token }) });
        } catch { /* Stripe has the money; the webhook settles the order. */ }
        router.push(statusPath(order.id, order.token));
        return;
      }
      if (body.payment.provider === "paypal" && body.payment.approveUrl) {
        window.location.assign(body.payment.approveUrl);
        return;
      }
      router.push(statusPath(order.id, order.token));
    } catch {
      setMessage(m.checkout.errors.connection);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={pay} className="flex flex-col gap-5" aria-busy={busy}>
      {message && <p role="alert" className="rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-ink">{message}</p>}
      <StepPayment
        data={{ method }}
        set={(p) => { if (p.method !== undefined) setMethod(p.method); setErrors((x) => ({ ...x, method: "" })); }}
        errors={errors} methods={methods} loading={loading} loadError={loadError}
        inline={selected?.provider === "stripe" && data?.stripePublishableKey ? (
          <StripeInline
            publishableKey={data.stripePublishableKey}
            method={selected.id}
            amount={shownTotal}
            email={email}
            name={name}
            classicSecret={classicSecret}
            onHandle={setStripeHandle}
          />
        ) : null}
      />
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
      <Button type="submit" size="xl" full loading={busy} disabled={loading || methods.length === 0 || (selected?.provider === "stripe" && !stripeHandle)}>
        {fmt(t.pay, { total: price(shownTotal) })}
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
