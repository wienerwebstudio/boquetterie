"use client";
import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { MailFallback } from "./mail-fallback";
import { fmtRich } from "./rich-text";
import { useI18n } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";

interface FormState { name: string; email: string; orderId: string; items: string; website: string }
type Errors = Partial<Record<keyof FormState, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const OFFICE_EMAIL = "office@blumora.at";

function validate(f: FormState, t: Messages["forms"]["withdrawal"]["errors"]): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = t.name;
  if (!EMAIL_RE.test(f.email.trim())) e.email = t.email;
  if (!/^[A-Za-z0-9-]{4,20}$/.test(f.orderId.trim())) e.orderId = t.orderId;
  return e;
}

/**
 * Withdrawal function: name, order number and e-mail – then one clearly labelled
 * button "Widerruf bestätigen". The answer shows the receipt time, the same
 * acknowledgement also goes out by e-mail (durable medium).
 */
export function WithdrawalForm() {
  const [form, setForm] = useState<FormState>({ name: "", email: "", orderId: "", items: "", website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [receipt, setReceipt] = useState<{ receivedAt: string; confirmationSent: boolean; id?: string } | null>(null);
  const [fallbackEmail, setFallbackEmail] = useState<string | null>(null);
  const { m, fmt, locale } = useI18n();
  const t = m.forms.withdrawal;

  const set = <K extends keyof FormState>(key: K) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validate(form, t.errors);
    setErrors(next);
    if (Object.keys(next).length) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), orderId: form.orderId.trim(), items: form.items.trim() || undefined, website: form.website, locale }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; errors?: Errors; code?: string; email?: string; receivedAt?: string; confirmationSent?: boolean; id?: string; message?: string } | null;
      if (!res.ok || !data?.ok) {
        if (data?.errors) setErrors(data.errors);
        setFallbackEmail(data?.code === "unavailable" && data.email ? data.email : null);
        setStatus(data?.errors ? "idle" : "failed");
        return;
      }
      setReceipt({ receivedAt: data.receivedAt ?? "", confirmationSent: Boolean(data.confirmationSent), id: data.id });
      setStatus("sent");
    } catch {
      setStatus("failed");
    }
  };

  if (status === "sent" && receipt) {
    return (
      <div role="status" aria-live="polite" className="rounded-md border border-line bg-white/70 p-8 sm:p-10">
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-success text-ivory"><Check className="size-5" strokeWidth={2.5} aria-hidden /></span>
        <h2 className="display-3 mt-5 text-ink">{t.receivedTitle}</h2>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
          {fmtRich(receipt.id ? t.receivedTextWithCase : t.receivedText, {
            receivedAt: <strong className="font-semibold text-ink">{receipt.receivedAt}</strong>,
            orderId: <strong className="font-semibold text-ink">{form.orderId.trim().toUpperCase()}</strong>,
            id: receipt.id,
          })}
        </p>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
          {receipt.confirmationSent
            ? fmtRich(t.confirmationSent, { email: <strong className="font-semibold text-ink">{form.email.trim()}</strong> })
            : t.confirmationNotSent}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate aria-label={t.formLabel}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label={m.forms.name} name="name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} required />
        <Input label={m.forms.emailAddress} name="email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set("email")} error={errors.email} required hint={t.emailHint} />
        <Input label={m.forms.orderNumber} name="orderId" placeholder="BQ-XXXXXX" autoComplete="off" value={form.orderId} onChange={set("orderId")} error={errors.orderId} required hint={t.orderNumberHint} />
        <Textarea
          label={t.items} name="items" optional rows={3} maxLength={1000}
          placeholder={t.itemsPlaceholder}
          value={form.items} onChange={set("items")} error={errors.items} className="sm:col-span-2"
        />
        <div className="hidden" aria-hidden>
          <label htmlFor="withdrawal-website">{m.forms.honeypot}</label>
          <input id="withdrawal-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
        </div>
      </div>

      <p className="mt-6 max-w-xl text-[14px] leading-relaxed text-ink-muted">
        {t.declaration}
      </p>

      {status === "failed" && fallbackEmail && (
        <MailFallback
          className="mt-5"
          email={fallbackEmail}
          subject={fmt(t.mailSubject, { orderId: form.orderId.trim().toUpperCase() })}
          body={[fmt(t.mailDeclaration, { items: form.items.trim() || t.mailAllItems }), "", `${m.forms.orderNumber}: ${form.orderId.trim().toUpperCase()}`, `${m.forms.name}: ${form.name.trim()}`].join("\n")}
        />
      )}
      {status === "failed" && !fallbackEmail && (
        <p role="alert" className="mt-5 rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-danger">
          {fmt(t.failed, { email: OFFICE_EMAIL })}
        </p>
      )}

      <div className="mt-7">
        <Button type="submit" size="lg" loading={status === "sending"}>{t.submit}</Button>
      </div>
    </form>
  );
}
