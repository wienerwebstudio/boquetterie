"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { Stripe, StripeElementsOptions, StripeError } from "@stripe/stripe-js";
import type { PaymentMethodId } from "@/types/payments";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/client";
import { displayCents, inlineElementsFor } from "./pay-logic";
import { STRIPE_APPEARANCE, STRIPE_FONTS, getStripe, stripeLocale } from "./stripe-shared";

/**
 * Stripe Payment Element shown inline under the selected entry of our own method list
 * (checkout step 5, offer page). Elements run in deferred mode – no PaymentIntent
 * exists yet: amount/currency are for display only, `allowedPaymentMethodTypes` is the
 * Stripe type of the chosen entry. The parent drives the one-step purchase through the
 * handle: `submit()` FIRST and synchronously in the click handler (Apple Pay needs the
 * user gesture), then the order is created, then `confirm()` with its client secret.
 *
 * Safety net: if Stripe refuses a deferred confirmation as an integration problem, the
 * parent passes `classicSecret` – Elements are then re-created for that existing intent
 * (Stripe's own tabs), so the stored order can still be paid without a second order.
 */
export interface StripeInlineHandle {
  /** True while Elements are bound to an existing intent (`classicSecret`). */
  classic: boolean;
  submit(): Promise<{ error?: StripeError }>;
  confirm(args: { clientSecret: string; returnUrl: string; email?: string }): Promise<{ error?: StripeError; status?: string }>;
}

export function StripeInline({ publishableKey, method, amount, email, name, classicSecret, onHandle, onLoadProblem }: {
  publishableKey: string;
  method: PaymentMethodId;
  /** Total the customer sees (EUR) – display only, the server decides what is charged. */
  amount: number;
  email?: string;
  name?: string;
  classicSecret?: string | null;
  onHandle: (handle: StripeInlineHandle | null) => void;
  /** The form could not be shown (script blocked, load error, no answer within 20 s). */
  onLoadProblem?: (kind: "load_error" | "load_timeout", message?: string) => void;
}) {
  const { locale, m } = useI18n();
  const t = m.pay.inline;
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [failed, setFailed] = useState(false);
  const config = inlineElementsFor(method);

  useEffect(() => {
    let alive = true;
    getStripe(publishableKey)
      .then((s) => { if (!alive) return; if (s) setStripe(s); else setFailed(true); })
      .catch(() => { if (alive) { setFailed(true); onLoadProblem?.("load_error", "Stripe.js could not be loaded"); } });
    return () => { alive = false; };
  }, [publishableKey, onLoadProblem]);

  useEffect(() => () => onHandle(null), [onHandle]);

  const cents = displayCents(amount);
  const options = useMemo<StripeElementsOptions>(() => {
    const common = { locale: stripeLocale(locale), appearance: STRIPE_APPEARANCE, fonts: STRIPE_FONTS };
    if (classicSecret) return { ...common, clientSecret: classicSecret };
    return { ...common, mode: "payment", amount: cents, currency: "eur", allowedPaymentMethodTypes: config?.types ?? ["card"] };
  }, [locale, classicSecret, cents, config]);

  if (failed) return <p role="alert" className="rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-ink">{t.loadFailed}</p>;
  if (!stripe || !config) return <InlineSkeleton label={t.loading} />;

  return (
    // A new method or the switch to the classic intent mounts a fresh Elements group.
    <Elements key={classicSecret ? `classic-${classicSecret.slice(0, 12)}` : method} stripe={stripe} options={options}>
      <InlineForm method={method} classic={Boolean(classicSecret)} email={email} name={name} onHandle={onHandle} onLoadProblem={onLoadProblem} />
    </Elements>
  );
}

function InlineSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label={label}>
      <Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" />
    </div>
  );
}

const LOAD_TIMEOUT_MS = 20_000;

function InlineForm({ method, classic, email, name, onHandle, onLoadProblem }: {
  method: PaymentMethodId; classic: boolean; email?: string; name?: string;
  onHandle: (handle: StripeInlineHandle | null) => void;
  onLoadProblem?: (kind: "load_error" | "load_timeout", message?: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { m } = useI18n();
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState(false);
  const readyRef = useRef(false);
  const config = inlineElementsFor(method);

  // The form never appeared: tell the customer (nothing was charged, no order exists yet).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (readyRef.current) return;
      setProblem(true);
      onLoadProblem?.("load_timeout");
    }, LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [onLoadProblem]);

  useEffect(() => {
    if (!ready || !stripe || !elements) return;
    onHandle({
      classic,
      // Not async on purpose: the returned promise is Stripe's own, created inside the click.
      submit: () => elements.submit(),
      confirm: async ({ clientSecret, returnUrl, email: receiptEmail }) => {
        const result = await stripe.confirmPayment({
          elements,
          ...(classic ? {} : { clientSecret }),
          confirmParams: { return_url: returnUrl, receipt_email: receiptEmail || undefined },
          redirect: "if_required",
        });
        if (result.error) return { error: result.error };
        return { status: result.paymentIntent?.status };
      },
    });
    return () => onHandle(null);
  }, [ready, stripe, elements, classic, onHandle]);

  return (
    <div className="min-h-12" data-testid="stripe-inline">
      {!ready && !problem && <InlineSkeleton label={m.pay.inline.loading} />}
      <div className={ready ? "" : "sr-only"}>
        <PaymentElement
          options={{
            layout: "tabs",
            ...(config?.order ? { paymentMethodOrder: config.order } : {}),
            wallets: config?.wallets,
            // Customers are in Austria: without this, Stripe guesses the country from the IP (a VPN shows a US ZIP field).
            defaultValues: { billingDetails: { email: email || undefined, name: name || undefined, address: { country: "AT" } } },
          }}
          onReady={() => { readyRef.current = true; setReady(true); setProblem(false); }}
          onLoadError={(e) => { setProblem(true); onLoadProblem?.("load_error", e.error?.message); }}
        />
      </div>
      {problem && !ready && <p role="alert" className="mt-2 rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-ink">{m.pay.inline.loadFailed}</p>}
    </div>
  );
}
