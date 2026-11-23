"use client";
import { useI18n, useLocalizedRouter } from "@/i18n/client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/ui/link";

import { ArrowLeft, ArrowRight, Lock, ShoppingBag } from "lucide-react";
import type { CartItem, Coupon } from "@/types";
import type { OrderCreateResponse } from "@/types/payments";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SocialMark } from "@/components/icons/social";
import { useCart } from "@/store/cart";
import { useDeliveryContext } from "@/store/delivery";
import { useDeliveryCheck } from "@/hooks/use-delivery-check";
import { isValidAustrianPostalCode, type DeliveryDay } from "@/lib/delivery";
import { computeTotals } from "@/lib/pricing";
import { routes } from "@/lib/urls";
import type { FieldErrors } from "@/lib/order-payload";
import {
  EMPTY_CHECKOUT, STEPS, buildPayload, clearCheckout, focusFirstError, loadCheckout, prefillFromCart, saveCheckout, stepForErrorKey, validateStep,
  type CheckoutData, type StepId,
} from "./checkout-state";
import { CheckoutProgress } from "./progress";
import { CollapsibleSummary, OrderSummary } from "./order-summary";
import { StepRecipient } from "./step-recipient";
import { StepDelivery } from "./step-delivery";
import { StepGreeting } from "./step-greeting";
import { StepCustomer } from "./step-customer";
import { StepPayment } from "./step-payment";
import type { StripeInlineHandle } from "./stripe-inline";
import { amountChanged, clearAttempt, displayCents, loadAttempt, saveAttempt, statusPath, type StripeAttempt } from "./pay-logic";
import { rich } from "./rich-text";
import { usePaymentMethods } from "./use-payment-methods";
import { clearDraftId, draftId, peekDraftId, postDraft } from "./checkout-draft";
import { submitFailureReason, type SubmitFailureReason } from "@/lib/payment-note";

// Stripe.js (and its script from js.stripe.com) is only needed once a Stripe method is
// selected in step 5 – keep it out of the checkout bundle until then.
const StripeInline = dynamic(() => import("./stripe-inline").then((m) => m.StripeInline), {
  ssr: false,
  loading: () => <PaymentLoading />,
});

function PaymentLoading() {
  const { m } = useI18n();
  return <p className="py-3 text-[14px] text-ink-muted" role="status">{m.checkout.paymentLoading}</p>;
}

/** Order answer of /api/orders and /api/orders/resume as the checkout reads it. */
type OrderAnswer = Partial<OrderCreateResponse> & { message?: string; errors?: FieldErrors };

/** Fire-and-forget history note "Zahlung nicht abgeschlossen: …" when submit() stopped after the order was created. */
function notePaymentNotFinished(order: { id: string; token: string }, reason: SubmitFailureReason, method: string, detail?: string) {
  try {
    void fetch("/api/orders/payment-note", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ orderId: order.id, token: order.token, reason, method, detail }),
    }).catch(() => undefined);
  } catch { /* ignore */ }
}

/** Fire-and-forget report of a browser-side payment problem for a stored order. */
function reportProblem(order: { id: string; token: string }, method: string, kind: "load_error" | "load_timeout" | "confirm_error", message?: string) {
  void import("./stripe-shared").then((m) => m.reportPaymentProblem({ orderId: order.id, token: order.token, method }, kind, message)).catch(() => undefined);
}

export interface CheckoutConfig {
  /** Greeting cards on offer; off = step 3 only says they are coming soon. */
  cardsEnabled: boolean;
  greetingMaxChars: number;
  freeCardIncluded: boolean;
  newsletterEnabled: boolean;
  /** True when the customer came back from a cancelled/failed provider payment (`?cancelled=1`). */
  cancelled?: boolean;
  /** WhatsApp chat for questions – one small line under the submit area (no floating button in the checkout). */
  whatsapp?: { href: string; is247: boolean } | null;
}

type Scope = "recipient" | "delivery" | "greeting" | "customer" | "payment";

/** Gate: waits for the persisted cart, handles the empty state, then mounts the form once. */
export function Checkout({ config }: { config: CheckoutConfig }) {
  const items = useCart((s) => s.items);
  const hydrated = useCart((s) => s.hydrated);
  const { m } = useI18n();

  if (!hydrated) {
    return (
      <div className="grid gap-10 lg:grid-cols-[1fr_400px]" aria-busy="true" aria-label={m.checkout.loading}>
        <div className="flex flex-col gap-5"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-2/3" /></div>
        <Skeleton className="hidden h-80 lg:block" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-ivory-200 text-forest"><ShoppingBag className="size-6" strokeWidth={1.5} aria-hidden /></span>
        <h1 className="display-3 text-ink">{m.checkout.empty.title}</h1>
        <p className="mt-3 text-[15px] text-ink-muted">{m.checkout.empty.text}</p>
        <Button href={routes.shop} size="lg" className="mt-8">{m.checkout.empty.cta}</Button>
      </div>
    );
  }

  return <CheckoutForm config={config} items={items} />;
}

/** Drops a stored date/window that the zone no longer offers. */
function reconcileDelivery(d: CheckoutData, days: DeliveryDay[]): CheckoutData {
  const day = days.find((x) => x.date === d.delivery.date);
  if (d.delivery.date && !day) return { ...d, delivery: { ...d.delivery, date: "", windowId: "" } };
  if (d.delivery.windowId && !day?.windows.some((w) => w.id === d.delivery.windowId)) return { ...d, delivery: { ...d.delivery, windowId: "" } };
  return d;
}

function CheckoutForm({ config, items }: { config: CheckoutConfig; items: CartItem[] }) {
  const router = useLocalizedRouter();
  const { m, fmt, price, locale, href } = useI18n();
  const t = m.checkout;
  const couponCode = useCart((s) => s.coupon);
  const clearCart = useCart((s) => s.clear);
  const contextZip = useDeliveryContext((s) => s.postalCode);

  const [data, setData] = useState<CheckoutData>(() => prefillFromCart(loadCheckout() ?? EMPTY_CHECKOUT, items, contextZip));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [maxReached, setMaxReached] = useState<StepId>(() => data.step);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(() => (config.cancelled ? t.errors.cancelled : null));
  /** Inline Payment Element of the selected Stripe method (null until it is ready). */
  const [stripeHandle, setStripeHandle] = useState<StripeInlineHandle | null>(null);
  /**
   * The Stripe order of this session that a retry continues (same cart and details – only the
   * payment failed, was cancelled or the method changed): no second order, same PaymentIntent.
   * The client secret is kept in memory only; after a reload `/api/orders/resume` returns it.
   */
  const attemptRef = useRef<(StripeAttempt & { clientSecret?: string; method?: string }) | null>(null);
  /** Server-side total of the current details (known once an order exists) – what Elements must show. */
  const [knownTotal, setKnownTotal] = useState<{ key: string; total: number } | null>(() => {
    const a = loadAttempt("checkout");
    return a ? { key: a.key, total: a.total } : null;
  });
  /** Safety net: Elements bound to the existing intent after Stripe refused the deferred confirmation. */
  const [classic, setClassic] = useState<{ key: string; secret: string } | null>(null);
  const [couponState, setCouponState] = useState<{ code: string; coupon: Coupon | null; error?: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => { saveCheckout(data); }, [data]);

  /* ---- Payment methods: only what is really available (provider configured) ---- */
  const { data: methodsData, loading: methodsLoading, error: methodsError } = usePaymentMethods();
  const methods = useMemo(() => methodsData?.methods ?? [], [methodsData]);
  // A stored method that is no longer offered (e.g. keys removed) is treated as "none selected".
  const selectedMethod = methods.find((m) => m.id === data.payment.method);
  const paymentData = useMemo<CheckoutData["payment"]>(() => ({ method: selectedMethod?.id ?? "" }), [selectedMethod]);

  /* ---- Delivery check: the most restrictive product decides about same-day ---- */
  const restrictiveSlug = useMemo(() => items.find((i) => !i.snapshot.sameDayCapable)?.snapshot.slug ?? items[0]?.snapshot.slug, [items]);
  const { result: lastResult, loading: checking, error: checkError, check } = useDeliveryCheck(restrictiveSlug);
  const checkedZip = useRef<string | null>(null);

  const runCheck = useCallback((plz: string) => {
    checkedZip.current = plz;
    check(plz).then((r) => { if (r) setData((d) => reconcileDelivery(d, r.available ? r.days : [])); });
  }, [check]);

  const zip = data.recipient.zip;
  useEffect(() => {
    if (!isValidAustrianPostalCode(zip)) { checkedZip.current = null; return; }
    if (checkedZip.current === zip) return;
    const t = setTimeout(() => runCheck(zip), 350);
    return () => clearTimeout(t);
  }, [zip, runCheck]);

  // Only trust a check result that belongs to the PLZ currently in the form.
  const result = lastResult && lastResult.postalCode === zip ? lastResult : null;
  const zone = result?.available ? result.zone : null;
  const days = useMemo(() => (result?.available ? result.days : []), [result]);

  /* ---- Coupon: definition fetched per code (re-validated server-side on order) ---- */
  const subtotal = useMemo(() => computeTotals({ items }).subtotal, [items]);
  useEffect(() => {
    if (!couponCode) return;
    let alive = true;
    fetch("/api/coupons/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: couponCode, subtotal }) })
      .then((r) => r.json() as Promise<{ ok: boolean; coupon?: Coupon; error?: string }>)
      .then((r) => { if (alive) setCouponState({ code: couponCode, coupon: r.ok && r.coupon ? r.coupon : null, error: r.ok ? undefined : r.error ?? t.errors.couponInvalid }); })
      .catch(() => { if (alive) setCouponState({ code: couponCode, coupon: null, error: t.errors.couponCheckFailed }); });
    return () => { alive = false; };
  }, [couponCode, subtotal, t]);
  const coupon = couponCode && couponState?.code === couponCode ? couponState.coupon : null;
  const couponError = couponCode && couponState?.code === couponCode ? couponState.error : undefined;

  const totals = useMemo(
    () => computeTotals({ items, zone, windowId: data.delivery.windowId || undefined, coupon }),
    [items, zone, data.delivery.windowId, coupon],
  );
  // Everything that defines the order except the payment method (the reuse fingerprint).
  const payloadFor = useCallback((d: CheckoutData) => buildPayload(config.cardsEnabled ? d : { ...d, greeting: EMPTY_CHECKOUT.greeting }, items, couponCode), [config.cardsEnabled, items, couponCode]);
  const currentKey = useMemo(() => JSON.stringify({ ...payloadFor(data), payment: undefined }), [payloadFor, data]);
  /** What the customer pays: the server's amount once known for these details, else the cart calculation. */
  const shownTotal = knownTotal?.key === currentKey ? knownTotal.total : totals.total;
  const classicSecret = classic?.key === currentKey ? classic.secret : null;
  const onStripeLoadProblem = useCallback((kind: "load_error" | "load_timeout", message?: string) => {
    const a = attemptRef.current ?? loadAttempt("checkout");
    if (a) reportProblem(a, data.payment.method, kind, message);
  }, [data.payment.method]);

  const selectedDay = days.find((d) => d.date === data.delivery.date);
  const windowLabel = selectedDay?.windows.find((w) => w.id === data.delivery.windowId)?.label;

  /* ---- Focus management on step change ---- */
  const step = data.step;
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  /* ---- "Abgebrochene Kasse": snapshot once the contact data is done (step 4 → 5, reload on 5) ---- */
  const draftKey = useRef<string | null>(null);
  useEffect(() => {
    if (step !== 5) return;
    // An order of exactly these details exists already – the order list shows it.
    if (loadAttempt("checkout")?.key === currentKey || draftKey.current === currentKey) return;
    draftKey.current = currentKey;
    const p = payloadFor(data);
    postDraft({
      id: draftId("checkout"), source: "checkout", step: 5, locale,
      items: p.items, couponCode: p.couponCode,
      contact: { firstName: p.customer.firstName, lastName: p.customer.lastName, email: p.customer.email, phone: p.customer.phone },
      recipient: p.recipient,
      delivery: { date: p.delivery.date, windowId: p.delivery.windowId },
    });
    // Only the details define the snapshot (`currentKey`), not every render of `data`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, currentKey, locale]);

  /* ---- Field helpers ---- */
  const setScope = useCallback(<S extends Scope>(scope: S) => (patch: Partial<CheckoutData[S]>) => {
    setData((d) => ({ ...d, [scope]: { ...d[scope], ...patch } }));
    setErrors((e) => {
      const keys = Object.keys(patch);
      if (!keys.some((k) => e[k])) return e;
      const next = { ...e };
      keys.forEach((k) => delete next[k]);
      return next;
    });
    setSubmitError(null);
  }, []);

  const validate = useCallback((s: StepId, d: CheckoutData): FieldErrors => {
    const day = days.find((x) => x.date === d.delivery.date);
    if (s === 3 && !config.cardsEnabled) return {};
    const e = validateStep(s, d, {
      zoneAvailable: result ? result.available : null,
      greetingMaxChars: config.greetingMaxChars,
      dateAvailable: Boolean(day),
      windowRequired: (day?.windows.length ?? 0) > 0,
      windowValid: day?.windows.some((w) => w.id === d.delivery.windowId) ?? false,
      t: t.validation,
    });
    if (s === 1 && !e.zip && result === null && isValidAustrianPostalCode(d.recipient.zip)) {
      e.zip = checking ? t.errors.zipChecking : t.errors.zipCheckFailed;
      if (!checking) runCheck(d.recipient.zip);
    }
    return e;
  }, [days, result, checking, runCheck, config.greetingMaxChars, config.cardsEnabled, t]);

  const onBlur = (field: string) => {
    const all = validate(step, data);
    setErrors((e) => {
      const next = { ...e };
      if (all[field]) next[field] = all[field]; else delete next[field];
      return next;
    });
  };

  const goTo = (s: StepId) => {
    setErrors({});
    setSubmitError(null);
    setData((d) => ({ ...d, step: s }));
  };

  const goNext = () => {
    const e = validate(step, data);
    if (Object.keys(e).length) { setErrors(e); requestAnimationFrame(() => focusFirstError(step, e)); return; }
    const next = Math.min(5, step + 1) as StepId;
    setMaxReached((m) => (next > m ? next : m));
    goTo(next);
  };

  const submit = async () => {
    if (submitting) return;
    // Re-validate every step – the catalog or delivery data may have changed meanwhile.
    for (const s of STEPS) {
      const e = validate(s.id, data);
      if (Object.keys(e).length) {
        setData({ ...data, step: s.id });
        setErrors(e);
        requestAnimationFrame(() => focusFirstError(s.id, e));
        return;
      }
    }
    if (methodsLoading || !selectedMethod) {
      setData({ ...data, step: 5 });
      setErrors({ method: t.validation.paymentMethod });
      return;
    }
    const payload = payloadFor(data);
    const reuseKey = JSON.stringify({ ...payload, payment: undefined });
    const isStripe = selectedMethod.provider === "stripe";
    const handle = stripeHandle;
    if (isStripe && (!methodsData?.stripePublishableKey || !handle)) {
      setSubmitError(m.pay.inline.loadFailed);
      return;
    }
    // Apple Pay / Google Pay need the click as user gesture: Stripe's submit() (validates the
    // fields, opens the wallet sheet) must start before anything is awaited.
    const submitted = isStripe && handle ? handle.submit() : null;
    setSubmitting(true);
    setSubmitError(null);
    const draft = peekDraftId("checkout");

    // Create the order – or continue the open Stripe order of these details. Runs right after
    // submit(), also when it stopped: the order exists even when the customer never finishes
    // the payment (fields left empty, wallet sheet closed), so the team sees the contact data.
    const obtainOrder = async (): Promise<OrderAnswer> => {
      if (isStripe) {
        const memo = attemptRef.current?.key === reuseKey ? attemptRef.current : null;
        const saved = loadAttempt("checkout");
        const stored = memo ?? (saved?.key === reuseKey ? saved : null);
        if (memo?.clientSecret && memo.method === selectedMethod.id) {
          return { ok: true, id: memo.id, token: memo.token, total: memo.total, payment: { provider: "stripe", status: "pending", clientSecret: memo.clientSecret } };
        }
        if (stored) {
          const res = await fetch("/api/orders/resume", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: stored.id, token: stored.token, method: selectedMethod.id }),
          });
          const resumed = (await res.json()) as OrderAnswer;
          if (res.ok && resumed.ok) return resumed;
          attemptRef.current = null;
          clearAttempt("checkout");
        }
      }
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        // The locale picks the language of the server's messages and of the customer mails;
        // the draft id removes this session's "Abgebrochene Kasse" entry.
        body: JSON.stringify({ ...payload, locale, ...(draft ? { draftId: draft } : {}) }),
      });
      const created = (await res.json()) as OrderAnswer;
      if (!res.ok) created.ok = undefined;
      return created;
    };

    try {
      // Stripe's documented order: finish submit() (validation, Apple/Google Pay sheet) BEFORE
      // any request. Safari aborts requests started while the Apple Pay sheet opens (seen live:
      // POST /api/orders → 499, the order existed but the page never confirmed the payment).
      /** Why Stripe's submit() stopped (null = fine or not Stripe). */
      let submitError: { message?: string; type: string; code?: string } | null = null;
      if (submitted) {
        try {
          submitError = (await submitted)?.error ?? null;
        } catch {
          submitError = { message: undefined, type: "api_error", code: undefined };
        }
      }
      let body: OrderAnswer;
      try {
        body = await obtainOrder();
      } catch {
        // Dropped connection: try once more (an order created by the lost request expires unpaid after 2 h).
        body = await obtainOrder();
      }
      if (!body.ok || !body.id || !body.token) {
        // Map server field errors ("recipient.zip") back to the step that owns them.
        const byStep = new Map<StepId, FieldErrors>();
        for (const [key, msg] of Object.entries(body.errors ?? {})) {
          const hit = stepForErrorKey(key);
          if (!hit) continue;
          byStep.set(hit.step, { ...(byStep.get(hit.step) ?? {}), [hit.field]: msg });
        }
        const target = [...byStep.keys()].sort()[0];
        if (target) {
          const forStep = byStep.get(target) ?? {};
          setData({ ...data, step: target });
          setErrors(forStep);
          setSubmitError(body.message ?? t.errors.checkFields);
          requestAnimationFrame(() => focusFirstError(target, forStep));
        } else {
          setSubmitError(body.message ?? t.errors.orderFailed);
        }
        return;
      }
      const order = { id: body.id, token: body.token };
      const payment = body.payment;
      // The server removed the draft with the order; a later snapshot starts a new one.
      clearDraftId("checkout");

      if (payment?.provider === "stripe") {
        const serverTotal = typeof body.total === "number" ? body.total : shownTotal;
        if (payment.status === "paid" || !payment.clientSecret || !handle) {
          // Paid meanwhile, or already processing: the status page follows the payment.
          finish(order);
          return;
        }
        const attempt = { key: reuseKey, id: order.id, token: order.token, total: serverTotal };
        attemptRef.current = { ...attempt, clientSecret: payment.clientSecret, method: selectedMethod.id };
        saveAttempt("checkout", attempt);
        setKnownTotal({ key: reuseKey, total: serverTotal });
        // submit() stopped (fields incomplete, wallet sheet closed): the order stays pending
        // (a retry continues it), the team sees why in its history, the customer the reason.
        if (submitError) {
          notePaymentNotFinished(order, submitFailureReason(selectedMethod.id, submitError), selectedMethod.id, [submitError.type, submitError.code].filter(Boolean).join(" · "));
          setSubmitError(submitError.message ?? t.errors.orderFailed);
          return;
        }
        // The server charges something else than Elements showed (coupon, fee changed):
        // never confirm a different amount – show it and let the customer click again.
        if (amountChanged(serverTotal, displayCents(shownTotal))) {
          setSubmitError(fmt(m.pay.inline.amountChanged, { total: price(serverTotal) }));
          return;
        }
        const returnUrl = `${window.location.origin}${href("/checkout/rueckkehr")}?orderId=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.token)}`;
        const result = await handle.confirm({ clientSecret: payment.clientSecret, returnUrl, email: data.customer.email });
        if (result.error) {
          // Incomplete fields are normal typing mistakes – everything else is worth knowing.
          if (result.error.type !== "validation_error") {
            reportProblem(order, selectedMethod.id, "confirm_error", [result.error.type, result.error.code, result.error.decline_code, result.error.message].filter(Boolean).join(" · "));
          }
          // Not the customer's input but our integration: offer Stripe's own form for this intent.
          if (!handle.classic && result.error.type === "invalid_request_error") {
            setClassic({ key: reuseKey, secret: payment.clientSecret });
            setSubmitError(m.pay.inline.retry);
            return;
          }
          setSubmitError(fmt(m.pay.inline.failed, { reason: result.error.message ?? "", orderId: order.id }));
          return;
        }
        // No redirect was needed (card, wallet): the server verifies the intent and marks the order paid.
        try {
          await fetch("/api/payments/stripe/confirm", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: order.id, token: order.token }),
          });
        } catch { /* Stripe has the money; the webhook settles the order. */ }
        finish(order);
        return;
      }
      if (payment?.provider === "paypal" && payment.approveUrl) {
        // Cart + form state are cleared on the status page after PayPal returns.
        window.location.assign(payment.approveUrl);
        return;
      }
      // Mock (paid immediately) or anything already settled.
      finish(order);
    } catch {
      setSubmitError(t.errors.connection);
    } finally {
      setSubmitting(false);
    }
  };

  const finish = (order: { id: string; token: string }) => {
    attemptRef.current = null;
    clearAttempt("checkout");
    clearCart();
    clearCheckout();
    router.push(statusPath(order.id, order.token));
  };

  const stepMeta = t.steps[STEPS.find((s) => s.id === step)!.key];
  // Only a deliverable day reaches the summary – not a half-typed date like "0026-11-16".
  const summaryDate = days.some((d) => d.date === data.delivery.date) ? data.delivery.date : undefined;
  const summaryProps = { items, totals, zone, deliveryDate: summaryDate, windowLabel, greeting: data.greeting, cardsEnabled: config.cardsEnabled, couponCode, couponError, recipient: data.recipient };
  const zoneStatus = { loading: checking, available: result ? result.available : null, zoneName: result?.zone?.name, error: checkError };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_440px] xl:gap-20">
      <div className="min-w-0">
        <div className="mb-6 lg:hidden"><CollapsibleSummary {...summaryProps} /></div>
        <CheckoutProgress current={step} maxReached={maxReached} onNavigate={goTo} />

        <section aria-labelledby="checkout-step-title" className="rounded-lg border border-line bg-white/60 p-5 sm:p-8">
          <p className="eyebrow mb-2">{fmt(t.stepEyebrow, { step, label: stepMeta.label })}</p>
          <h1 id="checkout-step-title" ref={headingRef} tabIndex={-1} className="display-3 mb-6 text-ink outline-none">{step === 3 && !config.cardsEnabled ? t.greetingComingSoonTitle : stepMeta.title}</h1>

          {submitError && (
            <p role="alert" className="mb-6 rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-ink">{submitError}</p>
          )}

          <form noValidate onSubmit={(e) => { e.preventDefault(); if (step === 5) submit(); else goNext(); }}>
            {step === 1 && <StepRecipient data={data.recipient} set={setScope("recipient")} errors={errors} onBlur={onBlur} zone={zoneStatus} />}
            {step === 2 && <StepDelivery data={data.delivery} set={setScope("delivery")} errors={errors} onBlur={onBlur} days={days} now={result?.now} zone={zone} loading={checking} />}
            {step === 3 && <StepGreeting data={data.greeting} set={setScope("greeting")} errors={errors} onBlur={onBlur} maxChars={config.greetingMaxChars} freeCardIncluded={config.freeCardIncluded} enabled={config.cardsEnabled} />}
            {step === 4 && <StepCustomer data={data.customer} set={setScope("customer")} errors={errors} onBlur={onBlur} newsletterEnabled={config.newsletterEnabled} />}
            {step === 5 && (
              <StepPayment
                data={paymentData} set={setScope("payment")} errors={errors} methods={methods} loading={methodsLoading} loadError={methodsError}
                inline={selectedMethod?.provider === "stripe" && methodsData?.stripePublishableKey ? (
                  <StripeInline
                    publishableKey={methodsData.stripePublishableKey}
                    method={selectedMethod.id}
                    amount={shownTotal}
                    email={data.customer.email}
                    name={`${data.customer.firstName} ${data.customer.lastName}`.trim()}
                    classicSecret={classicSecret}
                    onHandle={setStripeHandle}
                    onLoadProblem={onStripeLoadProblem}
                  />
                ) : null}
              />
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              {step > 1 ? (
                <Button type="button" variant="ghost" size="lg" icon={<ArrowLeft className="size-4" aria-hidden />} onClick={() => goTo((step - 1) as StepId)}>
                  {t.back}
                </Button>
              ) : (
                <Link href={routes.cart} className="inline-flex h-13 items-center gap-2 px-2 text-[15px] font-semibold text-forest"><ArrowLeft className="size-4" aria-hidden /> {t.toCart}</Link>
              )}
              {step < 5 ? (
                <Button type="submit" size="lg" iconRight={<ArrowRight className="size-4" aria-hidden />} className="sm:min-w-48">{t.next}</Button>
              ) : (
                <Button type="submit" size="xl" loading={submitting} disabled={methodsLoading || methods.length === 0 || (selectedMethod?.provider === "stripe" && !stripeHandle)} className="sm:min-w-64">
                  {fmt(t.submitWithTotal, { action: selectedMethod?.provider === "paypal" ? t.submitPaypal : t.submitBuy, total: price(shownTotal) })}
                </Button>
              )}
            </div>
            {step === 5 && (
              <p className="mt-4 text-[12.5px] leading-relaxed text-ink-soft">
                {rich(t.legal, {
                  terms: <Link href={routes.legal.terms} className="underline underline-offset-2">{t.terms}</Link>,
                  withdrawal: <Link href={routes.legal.withdrawal} className="underline underline-offset-2">{t.withdrawal}</Link>,
                })}
                {" "}{t.noWithdrawalRight}
              </p>
            )}
          </form>
          {config.whatsapp && (
            <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-ink-soft" data-testid="checkout-whatsapp">
              {m.layout.social.checkoutQuestions}
              <a href={config.whatsapp.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-6 items-center gap-1 font-semibold text-forest underline underline-offset-2">
                <SocialMark network="whatsapp" className="size-3.5" />
                {config.whatsapp.is247 ? m.layout.social.whatsapp247 : "WhatsApp"}
                <span className="sr-only"> {m.layout.social.newTab}</span>
              </a>
            </p>
          )}
        </section>

        <p className="mt-6 flex items-center gap-2 text-[12.5px] text-ink-soft lg:hidden">
          <Lock className="size-3.5 text-forest" aria-hidden /> {t.secureMobile}
        </p>
      </div>

      <div className="hidden lg:block">
        <div className="sticky top-24"><OrderSummary {...summaryProps} /></div>
      </div>
    </div>
  );
}
