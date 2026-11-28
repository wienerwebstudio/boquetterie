"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Check, ArrowRight } from "lucide-react";
import type { SubscriptionConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/format";
import { onRadioGroupKeyDown, rovingTabIndex } from "@/lib/roving-radio";
import { usePaymentMethods } from "@/components/checkout/use-payment-methods";
import { useI18n } from "@/i18n/client";
import { fmtRich } from "@/components/content/rich-text";

type Status = { kind: "idle" | "loading" | "success" | "error"; message?: string };

const subscribeNoop = () => () => {};
function readAboSuccess() {
  try {
    return new URLSearchParams(window.location.search).get("abo") === "erfolg";
  } catch {
    return false;
  }
}

function discounted(price: number, discount: number) {
  return Math.round(price * (1 - discount / 100) * 100) / 100;
}

/**
 * Interactive part of the subscription page: frequency selector, plan cards with
 * discounted prices and an inline request form (no payment – a request only).
 */
export function SubscriptionPlanner({ config }: { config: SubscriptionConfig }) {
  const frequencies = config.frequencies;
  const plans = config.plans;
  const defaultPlan = plans.find((p) => p.popular)?.id ?? plans[0]?.id ?? "";
  const [frequencyId, setFrequencyId] = useState(frequencies[0]?.id ?? "");
  const [planId, setPlanId] = useState(defaultPlan);
  const [formOpen, setFormOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const formRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const { m, fmt, price: formatPrice } = useI18n();
  const t = m.home.planner;

  /* ---- Online checkout (Stripe Checkout, subscription mode) – only when Stripe is configured ---- */
  const { data: methodsData } = usePaymentMethods();
  const checkoutAvailable = Boolean(methodsData?.subscriptionCheckout);
  const [checkout, setCheckout] = useState<Status>({ kind: "idle" });
  // `/blumen-abo?abo=erfolg` after Stripe Checkout – read client-side so the page itself stays static.
  const aboSuccess = useSyncExternalStore(subscribeNoop, readAboSuccess, () => false);

  const startCheckout = async () => {
    if (checkout.kind === "loading") return;
    setCheckout({ kind: "loading" });
    try {
      const res = await fetch("/api/payments/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, frequencyId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; message?: string };
      if (!res.ok || !data.ok || !data.url) {
        setCheckout({ kind: "error", message: data.message ?? t.checkoutError });
        return;
      }
      window.location.assign(data.url);
    } catch {
      setCheckout({ kind: "error", message: t.checkoutError });
    }
  };

  const frequency = frequencies.find((f) => f.id === frequencyId) ?? frequencies[0];
  const plan = plans.find((p) => p.id === planId) ?? plans[0];

  useEffect(() => {
    if (formOpen) {
      const t = setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        formRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      }, 60);
      return () => clearTimeout(t);
    }
  }, [formOpen]);

  const choosePlan = (pid: string) => {
    setPlanId(pid);
    if (!checkoutAvailable) setFormOpen(true);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();
    const next: typeof errors = {};
    if (name.length < 2) next.name = t.nameRequired;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) next.email = m.forms.invalidEmailEnter;
    setErrors(next);
    if (Object.keys(next).length) return;

    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/subscription-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, plan: planId, frequency: frequencyId, message }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setStatus({ kind: "error", message: data.message ?? m.forms.genericError });
        return;
      }
      setStatus({ kind: "success" });
    } catch {
      setStatus({ kind: "error", message: m.forms.genericError });
    }
  };

  return (
    <div>
      {/* Frequency */}
      {frequencies.length > 0 && (
        <fieldset className="mb-8 sm:mb-10">
          <legend className="eyebrow mb-4">{t.chooseRhythm}</legend>
          <div role="radiogroup" aria-label={t.rhythmLabel} onKeyDown={onRadioGroupKeyDown} className="inline-flex max-w-full flex-wrap gap-2 rounded-md bg-ivory-100 p-1.5">
            {frequencies.map((f, i) => {
              const active = f.id === frequency?.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  tabIndex={rovingTabIndex(active, i, Boolean(frequency))}
                  onClick={() => setFrequencyId(f.id)}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-[6px] px-4 text-[14px] font-semibold transition-all duration-300 ease-[var(--ease-soft)]",
                    active ? "bg-forest text-ivory shadow-soft" : "text-ink hover:bg-white",
                  )}
                >
                  {f.label}
                  {f.discount > 0 && (
                    <span className={cn("rounded-sm px-1.5 py-0.5 text-[10.5px] font-bold tracking-[0.08em]", active ? "bg-ivory/15 text-ivory" : "bg-rose-100 text-burgundy")}>−{f.discount}%</span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Plans */}
      <ul className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        {plans.map((p) => {
          const active = p.id === plan?.id;
          const price = frequency ? discounted(p.price, frequency.discount) : p.price;
          const reduced = frequency && frequency.discount > 0;
          return (
            <li key={p.id}>
              <article
                aria-labelledby={`${id}-${p.id}`}
                className={cn(
                  "relative flex h-full flex-col rounded-md bg-white p-6 shadow-soft transition-all duration-300 ease-[var(--ease-soft)] sm:p-7",
                  active ? "ring-1 ring-forest" : "ring-1 ring-transparent hover:ring-line",
                )}
              >
                {p.popular && (
                  <span className="absolute right-5 top-5 rounded-sm bg-forest px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ivory">{t.popular}</span>
                )}
                <p className="eyebrow">{p.stems}</p>
                <h3 id={`${id}-${p.id}`} className="mt-2 font-serif text-[32px] leading-none text-ink">{p.name}</h3>
                <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-ink-muted">{p.description}</p>
                <div className="mt-6 flex items-baseline gap-2 border-t border-line pt-5">
                  <span className="font-serif text-[30px] leading-none text-ink tabular-nums">{formatPrice(price)}</span>
                  {reduced && <s className="text-[13px] text-ink-soft tabular-nums">{formatPrice(p.price)}</s>}
                  <span className="text-[12px] text-ink-muted">{t.perDelivery}</span>
                </div>
                <p className="mt-1 text-[12px] text-ink-soft">{frequency?.label ?? ""}{reduced ? ` · ${fmt(t.discount, { discount: frequency.discount })}` : ""}</p>
                <Button type="button" onClick={() => choosePlan(p.id)} variant={active ? "primary" : "outline"} size="md" full className="mt-5">
                  {checkoutAvailable ? (active ? t.selected : fmt(t.choosePlan, { name: p.name })) : active && formOpen ? t.selected : fmt(t.requestPlan, { name: p.name })}
                </Button>
              </article>
            </li>
          );
        })}
      </ul>

      {/* Success after Stripe Checkout */}
      {aboSuccess && (
        <div role="status" className="mt-8 flex items-start gap-4 rounded-md bg-white p-6 shadow-soft animate-fade-up sm:p-8">
          <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-ivory"><Check className="size-4" strokeWidth={3} aria-hidden /></span>
          <div>
            <p className="font-serif text-[24px] leading-tight text-ink">{t.checkoutDoneTitle}</p>
            <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-muted">{t.checkoutDoneText}</p>
          </div>
        </div>
      )}

      {/* CTA */}
      {checkoutAvailable ? (
        <div className="mt-8 flex flex-col gap-3">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Button type="button" size="lg" loading={checkout.kind === "loading"} iconRight={<ArrowRight className="size-4" aria-hidden />} onClick={startCheckout}>
              {t.checkout}
            </Button>
            {!formOpen && (
              <Button type="button" size="lg" variant="ghost" onClick={() => setFormOpen(true)}>{t.requestInstead}</Button>
            )}
          </div>
          <p className="text-[13px] text-ink-soft">
            {plan && frequency ? <>{fmt(t.selectionSummary, { plan: plan.name, frequency: frequency.label.toLowerCase(), price: formatPrice(discounted(plan.price, frequency.discount)) })}{" "}</> : null}
            {t.securePayment}
          </p>
          <div aria-live="polite" className="min-h-[1rem]">
            {checkout.kind === "error" && <p className="text-[13px] text-danger">{checkout.message}</p>}
          </div>
        </div>
      ) : !formOpen && (
        <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Button type="button" size="lg" onClick={() => setFormOpen(true)}>{t.sendRequest}</Button>
          <p className="text-[13px] text-ink-soft">{t.noObligation}</p>
        </div>
      )}

      {/* Form */}
      <div ref={formRef} className={cn("scroll-mt-28", formOpen ? "mt-12 sm:mt-16" : "hidden")} aria-hidden={!formOpen}>
        {status.kind === "success" ? (
          <div role="status" className="flex items-start gap-4 rounded-md bg-white p-6 shadow-soft animate-fade-up sm:p-8">
            <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-ivory"><Check className="size-4" strokeWidth={3} aria-hidden /></span>
            <div>
              <p className="font-serif text-[24px] leading-tight text-ink">{t.thanksTitle}</p>
              <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-muted">
                {fmtRich(t.thanksText, { plan: <strong className="text-ink">{plan?.name}</strong>, frequency: frequency?.label })}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="rounded-md bg-white p-6 shadow-soft sm:p-8">
            <div className="mb-6">
              <p className="eyebrow mb-2">{t.formEyebrow}</p>
              <h3 className="font-serif text-[28px] leading-tight text-ink">{t.formTitle}</h3>
              <p className="mt-2 text-[14px] text-ink-muted">{t.formText}</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label={m.forms.name} name="name" autoComplete="name" required error={errors.name} />
              <Input label={m.forms.email} name="email" type="email" autoComplete="email" inputMode="email" required error={errors.email} />
              <Select label={t.plan} name="plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name} – {p.stems}</option>)}
              </Select>
              <Select label={t.rhythm} name="frequency" value={frequencyId} onChange={(e) => setFrequencyId(e.target.value)}>
                {frequencies.map((f) => <option key={f.id} value={f.id}>{f.label}{f.discount > 0 ? ` (−${f.discount}%)` : ""}</option>)}
              </Select>
              <Textarea label={m.forms.message} name="message" optional className="sm:col-span-2" placeholder={t.messagePlaceholder} maxLength={1000} />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-ink-soft">
                {plan && frequency ? fmtRich(t.currentSelection, { plan: <strong className="text-ink">{plan.name}</strong>, frequency: frequency.label.toLowerCase(), price: formatPrice(discounted(plan.price, frequency.discount)) }) : null}
              </p>
              <Button type="submit" size="lg" loading={status.kind === "loading"}>{t.sendRequest}</Button>
            </div>
            <div aria-live="polite" className="mt-3 min-h-[1rem]">
              {status.kind === "error" && <p className="text-[13px] text-danger">{status.message}</p>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
