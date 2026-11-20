"use client";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { useEffect, useMemo, useRef, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Appearance, type Stripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { ArrowLeft, CreditCard, Lock } from "lucide-react";
import type { PaymentMethodId, PaymentConfirmResponse } from "@/types/payments";
import Link from "@/components/ui/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/urls";
import { Skeleton } from "@/components/ui/skeleton";
import { rich } from "./rich-text";
import { buildSlots, slotLabel, type MethodSlot } from "./stripe-methods";

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

export function StripePaymentForm({ publishableKey, session, amount, email, name, onDone, onCancel, backPath }: {
  publishableKey: string;
  /** German path the return page offers when a redirect payment failed (default: the checkout). */
  backPath?: string;
  session: StripeSession;
  amount: number;
  email: string;
  /** Orderer's name from step 4 – prefilled in the Payment Element. */
  name?: string;
  /** Called once Stripe reports success (or "processing") and the server has been informed. */
  onDone: (status: PaymentConfirmResponse["status"]) => void;
  onCancel: () => void;
}) {
  const { locale } = useI18n();
  const stripePromise = useMemo(() => getStripe(publishableKey), [publishableKey]);
  const intent = useIntentMethods(stripePromise, session);
  const [picked, setPicked] = useState<string | null>(null);
  // Safety net: Stripe refused the deferred confirmation → Stripe's own tabs (classic mode).
  const [classic, setClassic] = useState(false);
  const formProps = { session, amount, email, name, onDone, onCancel, backPath };

  if (intent === "loading") return <FormSkeleton />;

  // Normal case: our own swipeable row of payment methods; the Payment Element below
  // only shows the chosen one (no "more" dropdown on phones). Elements run in deferred
  // mode and confirm against the order's existing PaymentIntent.
  if (intent !== "fallback" && !classic) {
    const slot = intent.slots.find((x) => x.id === picked) ?? intent.slots[0];
    const options: StripeElementsOptions = {
      mode: "payment",
      amount: intent.amount,
      currency: intent.currency,
      allowedPaymentMethodTypes: slot.types,
      locale: stripeLocale(locale),
      appearance,
    };
    return (
      <Elements stripe={stripePromise} options={options}>
        <StripeForm {...formProps} deferred slots={intent.slots} slot={slot.id} onSlot={setPicked} onIntegrationError={() => setClassic(true)} />
      </Elements>
    );
  }

  // Fallback (intent could not be read in the browser): Stripe's own tabs.
  return (
    <Elements stripe={stripePromise} options={{ clientSecret: session.clientSecret, locale: stripeLocale(locale), appearance }}>
      <StripeForm {...formProps} />
    </Elements>
  );
}

/** Reads the methods, amount and currency of the order's PaymentIntent in the browser. */
function useIntentMethods(stripePromise: Promise<Stripe | null>, session: StripeSession) {
  const [state, setState] = useState<"loading" | "fallback" | { slots: MethodSlot[]; amount: number; currency: string }>("loading");
  useEffect(() => {
    let alive = true;
    stripePromise
      .then((stripe) => (stripe ? stripe.retrievePaymentIntent(session.clientSecret) : null))
      .then((res) => {
        if (!alive) return;
        const pi = res?.paymentIntent;
        const slots = pi ? buildSlots(pi.payment_method_types ?? [], session.method) : [];
        setState(pi && slots.length > 0 ? { slots, amount: pi.amount, currency: pi.currency } : "fallback");
      })
      .catch(() => { if (alive) setState("fallback"); });
    return () => { alive = false; };
  }, [stripePromise, session.clientSecret, session.method]);
  return state;
}

function FormSkeleton() {
  return <div className="flex flex-col gap-3" aria-hidden><Skeleton className="h-12 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-2/3" /></div>;
}

/** Horizontal, swipeable choice of payment methods (radio group, scroll-snap). */
function MethodRow({ slots, value, onChange, disabled }: { slots: MethodSlot[]; value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const { m } = useI18n();
  const rowRef = useRef<HTMLDivElement>(null);
  const select = (id: string) => {
    onChange(id);
    rowRef.current?.querySelector<HTMLElement>(`[data-slot="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = slots[(i + d + slots.length) % slots.length];
    select(next.id);
    rowRef.current?.querySelector<HTMLElement>(`[data-slot="${next.id}"]`)?.focus();
  };
  if (slots.length < 2) return null;
  return (
    <div ref={rowRef} role="radiogroup" aria-label={m.checkout.payment.method} data-testid="stripe-method-row"
      className="-mx-1 flex w-0 min-w-[calc(100%+0.5rem)] snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {slots.map((s, i) => {
        const active = s.id === value;
        return (
          <button key={s.id} type="button" role="radio" aria-checked={active} data-slot={s.id} disabled={disabled}
            tabIndex={active ? 0 : -1} onClick={() => select(s.id)} onKeyDown={(e) => onKey(e, i)}
            className={`flex h-14 min-w-[7.5rem] shrink-0 snap-start items-center justify-center gap-2 rounded-lg border px-4 text-[14px] font-semibold transition-colors ${active ? "border-2 border-forest bg-white text-forest shadow-soft" : "border-line bg-white/70 text-ink-muted hover:border-forest/40 hover:text-ink"}`}>
            {s.id === "card" && <CreditCard className="size-4.5" strokeWidth={1.75} aria-hidden />}
            {slotLabel(s.id, m.checkout.stripe.card)}
          </button>
        );
      })}
    </div>
  );
}

/** Tells the server about a problem that never reaches Stripe's logs (best effort, never throws). */
function reportPaymentProblem(session: StripeSession, kind: "load_error" | "load_timeout" | "confirm_error", message?: string) {
  try {
    void fetch("/api/payments/stripe/client-event", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ orderId: session.orderId, token: session.token, kind, method: session.method, message }),
    }).catch(() => undefined);
  } catch { /* ignore */ }
}

/** Our languages → Stripe Elements locales (unsupported ones follow the browser). */
function stripeLocale(l: Locale): StripeElementsOptions["locale"] {
  if (l === "bks") return "hr";
  if (l === "uk" || l === "fa" || l === "ce") return "auto";
  return l;
}

const LOAD_TIMEOUT_MS = 20_000;

function StripeForm({ session, amount, email, name, onDone, onCancel, backPath, deferred, slots, slot, onSlot, onIntegrationError }: {
  session: StripeSession; amount: number; email: string; name?: string; backPath?: string;
  /** Deferred-mode Elements (swipe row): validate with `elements.submit()` and pass the client secret on confirm. */
  deferred?: boolean; slots?: MethodSlot[]; slot?: string; onSlot?: (id: string) => void; onIntegrationError?: () => void;
  onDone: (status: PaymentConfirmResponse["status"]) => void; onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadProblem, setLoadProblem] = useState(false);
  const readyRef = useRef(false);
  const { href, m, fmt, price } = useI18n();
  const t = m.checkout.stripe;

  // The form never appeared: tell the customer what to do and let the team know.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (readyRef.current) return;
      setLoadProblem(true);
      reportPaymentProblem(session, "load_timeout");
    }, LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [session]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    setError(null);
    const returnUrl = `${window.location.origin}${href("/checkout/rueckkehr")}?orderId=${encodeURIComponent(session.orderId)}&token=${encodeURIComponent(session.token)}${backPath ? `&back=${encodeURIComponent(backPath)}` : ""}`;
    if (deferred) {
      const checked = await elements.submit();
      if (checked.error) {
        setError(checked.error.message ?? t.failed);
        setBusy(false);
        return;
      }
    }
    const result = await stripe.confirmPayment({
      elements,
      ...(deferred ? { clientSecret: session.clientSecret } : {}),
      confirmParams: { return_url: returnUrl, receipt_email: email || undefined },
      redirect: "if_required",
    });
    if (result.error) {
      // Incomplete fields are normal typing mistakes – everything else is worth knowing.
      if (result.error.type !== "validation_error") {
        reportPaymentProblem(session, "confirm_error", [result.error.type, result.error.code, result.error.decline_code, result.error.message].filter(Boolean).join(" · "));
      }
      setError(result.error.message ?? t.failed);
      setBusy(false);
      // Not the customer's input (card declined, missing field) but our integration: retry in classic mode.
      if (deferred && result.error.type === "invalid_request_error") onIntegrationError?.();
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
        {rich(t.orderCreated, { orderId: <strong className="font-semibold text-ink">{session.orderId}</strong> })}
      </p>
      {deferred && slots && slot && onSlot && <MethodRow slots={slots} value={slot} onChange={onSlot} disabled={busy} />}
      <div className="min-h-40">
        {!ready && <div className="flex flex-col gap-3" aria-hidden><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-2/3" /></div>}
        <div className={ready ? "" : "sr-only"}>
          <PaymentElement
            options={{
              layout: "tabs",
              paymentMethodOrder: PM_ORDER[session.method],
              // Customers are in Austria: without this, Stripe guesses the country from the IP (a VPN shows a US ZIP field).
              defaultValues: { billingDetails: { email: email || undefined, name: name || undefined, address: { country: "AT" } } },
            }}
            onReady={() => { readyRef.current = true; setReady(true); setLoadProblem(false); }}
            onLoadError={(e) => {
              setLoadProblem(true);
              reportPaymentProblem(session, "load_error", e.error?.message);
            }}
          />
        </div>
      </div>
      {loadProblem && !ready && (
        <p role="alert" className="rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-ink">
          {fmt(t.loadProblem, { orderId: session.orderId })}
        </p>
      )}
      {error && <p role="alert" className="rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-ink">{error}</p>}
      <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" size="lg" icon={<ArrowLeft className="size-4" aria-hidden />} onClick={onCancel} disabled={busy}>
          {t.back}
        </Button>
        <Button type="submit" size="xl" loading={busy} disabled={!ready || !stripe} className="sm:min-w-64">
          {fmt(t.pay, { amount: price(amount) })}
        </Button>
      </div>
      <p className="text-[12.5px] leading-relaxed text-ink-soft">
        {rich(t.legal, {
          terms: <Link href={routes.legal.terms} className="underline underline-offset-2">{m.checkout.terms}</Link>,
          withdrawal: <Link href={routes.legal.withdrawal} className="underline underline-offset-2">{m.checkout.withdrawal}</Link>,
        })}{" "}{m.checkout.noWithdrawalRight}
      </p>
      <p className="flex items-start gap-2 text-[12.5px] text-ink-soft">
        <Lock className="mt-0.5 size-3.5 shrink-0 text-forest" aria-hidden />
        {t.secure}
      </p>
    </form>
  );
}
