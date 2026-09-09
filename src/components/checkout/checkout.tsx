"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Lock, ShoppingBag } from "lucide-react";
import type { CartItem, Coupon, PaymentMethodConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/store/cart";
import { useDeliveryContext } from "@/store/delivery";
import { useDeliveryCheck } from "@/hooks/use-delivery-check";
import { isValidAustrianPostalCode, type DeliveryDay } from "@/lib/delivery";
import { computeTotals } from "@/lib/pricing";
import { formatPrice } from "@/lib/format";
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

export interface CheckoutConfig {
  payments: PaymentMethodConfig[];
  greetingMaxChars: number;
  freeCardIncluded: boolean;
  newsletterEnabled: boolean;
}

type Scope = "recipient" | "delivery" | "greeting" | "customer" | "payment";

/** Gate: waits for the persisted cart, handles the empty state, then mounts the form once. */
export function Checkout({ config }: { config: CheckoutConfig }) {
  const items = useCart((s) => s.items);
  const hydrated = useCart((s) => s.hydrated);

  if (!hydrated) {
    return (
      <div className="grid gap-10 lg:grid-cols-[1fr_400px]" aria-busy="true" aria-label="Kasse wird geladen">
        <div className="flex flex-col gap-5"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-2/3" /></div>
        <Skeleton className="hidden h-80 lg:block" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-ivory-200 text-forest"><ShoppingBag className="size-6" strokeWidth={1.5} aria-hidden /></span>
        <h1 className="display-3 text-ink">Dein Warenkorb ist leer</h1>
        <p className="mt-3 text-[15px] text-ink-muted">Such dir einen Strauß aus – wir kümmern uns um den Rest.</p>
        <Button href={routes.shop} size="lg" className="mt-8">Blumen entdecken</Button>
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
  const router = useRouter();
  const couponCode = useCart((s) => s.coupon);
  const clearCart = useCart((s) => s.clear);
  const contextZip = useDeliveryContext((s) => s.postalCode);

  const [data, setData] = useState<CheckoutData>(() => prefillFromCart(loadCheckout() ?? EMPTY_CHECKOUT, items, contextZip));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [maxReached, setMaxReached] = useState<StepId>(() => data.step);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [couponState, setCouponState] = useState<{ code: string; coupon: Coupon | null; error?: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => { saveCheckout(data); }, [data]);

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
      .then((r) => { if (alive) setCouponState({ code: couponCode, coupon: r.ok && r.coupon ? r.coupon : null, error: r.ok ? undefined : r.error ?? "Dieser Code ist nicht gültig." }); })
      .catch(() => { if (alive) setCouponState({ code: couponCode, coupon: null, error: "Der Gutschein konnte gerade nicht geprüft werden." }); });
    return () => { alive = false; };
  }, [couponCode, subtotal]);
  const coupon = couponCode && couponState?.code === couponCode ? couponState.coupon : null;
  const couponError = couponCode && couponState?.code === couponCode ? couponState.error : undefined;

  const totals = useMemo(
    () => computeTotals({ items, zone, windowId: data.delivery.windowId || undefined, coupon }),
    [items, zone, data.delivery.windowId, coupon],
  );
  const selectedDay = days.find((d) => d.date === data.delivery.date);
  const windowLabel = selectedDay?.windows.find((w) => w.id === data.delivery.windowId)?.label;

  /* ---- Focus management on step change ---- */
  const step = data.step;
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

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
    const e = validateStep(s, d, {
      zoneAvailable: result ? result.available : null,
      greetingMaxChars: config.greetingMaxChars,
      dateAvailable: Boolean(day),
      windowRequired: (day?.windows.length ?? 0) > 0,
      windowValid: day?.windows.some((w) => w.id === d.delivery.windowId) ?? false,
    });
    if (s === 1 && !e.zip && result === null && isValidAustrianPostalCode(d.recipient.zip)) {
      e.zip = checking ? "Wir prüfen die Postleitzahl gerade – bitte einen Moment." : "Die Postleitzahl konnte nicht geprüft werden. Bitte versuch es noch einmal.";
      if (!checking) runCheck(d.recipient.zip);
    }
    return e;
  }, [days, result, checking, runCheck, config.greetingMaxChars]);

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
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(data, items, couponCode)),
      });
      const body = (await res.json()) as { ok: boolean; id?: string; token?: string; message?: string; errors?: FieldErrors };
      if (!res.ok || !body.ok || !body.id || !body.token) {
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
          setSubmitError(body.message ?? "Bitte prüfe deine Angaben.");
          requestAnimationFrame(() => focusFirstError(target, forStep));
        } else {
          setSubmitError(body.message ?? "Die Bestellung konnte nicht abgeschlossen werden. Bitte versuch es noch einmal.");
        }
        return;
      }
      clearCart();
      clearCheckout();
      router.push(`/bestellung/${encodeURIComponent(body.id)}?token=${encodeURIComponent(body.token)}&neu=1`);
    } catch {
      setSubmitError("Die Verbindung wurde unterbrochen. Bitte prüfe deine Internetverbindung und versuch es noch einmal.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepMeta = STEPS.find((s) => s.id === step)!;
  const summaryProps = { items, totals, zone, deliveryDate: data.delivery.date || undefined, windowLabel, greeting: data.greeting, couponCode, couponError };
  const zoneStatus = { loading: checking, available: result ? result.available : null, zoneName: result?.zone?.name, error: checkError };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_440px] xl:gap-20">
      <div className="min-w-0">
        <div className="mb-6 lg:hidden"><CollapsibleSummary {...summaryProps} /></div>
        <CheckoutProgress current={step} maxReached={maxReached} onNavigate={goTo} />

        <section aria-labelledby="checkout-step-title" className="rounded-lg border border-line bg-white/60 p-5 sm:p-8">
          <p className="eyebrow mb-2">Schritt {step} · {stepMeta.label}</p>
          <h1 id="checkout-step-title" ref={headingRef} tabIndex={-1} className="display-3 mb-6 text-ink outline-none">{stepMeta.title}</h1>

          {submitError && (
            <p role="alert" className="mb-6 rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-ink">{submitError}</p>
          )}

          <form noValidate onSubmit={(e) => { e.preventDefault(); if (step === 5) submit(); else goNext(); }}>
            {step === 1 && <StepRecipient data={data.recipient} set={setScope("recipient")} errors={errors} onBlur={onBlur} zone={zoneStatus} />}
            {step === 2 && <StepDelivery data={data.delivery} set={setScope("delivery")} errors={errors} onBlur={onBlur} days={days} now={result?.now} zone={zone} loading={checking} />}
            {step === 3 && <StepGreeting data={data.greeting} set={setScope("greeting")} errors={errors} onBlur={onBlur} maxChars={config.greetingMaxChars} freeCardIncluded={config.freeCardIncluded} />}
            {step === 4 && <StepCustomer data={data.customer} set={setScope("customer")} errors={errors} onBlur={onBlur} newsletterEnabled={config.newsletterEnabled} />}
            {step === 5 && <StepPayment data={data.payment} set={setScope("payment")} errors={errors} methods={config.payments} />}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              {step > 1 ? (
                <Button type="button" variant="ghost" size="lg" icon={<ArrowLeft className="size-4" aria-hidden />} onClick={() => goTo((step - 1) as StepId)}>
                  Zurück
                </Button>
              ) : (
                <Link href={routes.cart} className="inline-flex h-13 items-center gap-2 px-2 text-[15px] font-semibold text-forest"><ArrowLeft className="size-4" aria-hidden /> Zum Warenkorb</Link>
              )}
              {step < 5 ? (
                <Button type="submit" size="lg" iconRight={<ArrowRight className="size-4" aria-hidden />} className="sm:min-w-48">Weiter</Button>
              ) : (
                <Button type="submit" size="xl" loading={submitting} disabled={config.payments.length === 0} className="sm:min-w-64">
                  Jetzt kaufen · {formatPrice(totals.total)}
                </Button>
              )}
            </div>
            {step === 5 && (
              <p className="mt-4 text-[12.5px] leading-relaxed text-ink-soft">
                Mit Klick auf „Jetzt kaufen“ gibst du eine zahlungspflichtige Bestellung auf. Es gelten unsere{" "}
                <Link href={routes.legal.terms} className="underline underline-offset-2">AGB</Link> und die <Link href={routes.legal.withdrawal} className="underline underline-offset-2">Widerrufsbelehrung</Link>.
              </p>
            )}
          </form>
        </section>

        <p className="mt-6 flex items-center gap-2 text-[12.5px] text-ink-soft lg:hidden">
          <Lock className="size-3.5 text-forest" aria-hidden /> Sicher bezahlen · SSL-verschlüsselt
        </p>
      </div>

      <div className="hidden lg:block">
        <div className="sticky top-24"><OrderSummary {...summaryProps} /></div>
      </div>
    </div>
  );
}
