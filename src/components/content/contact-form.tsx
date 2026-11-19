"use client";
import { useState, type FormEvent } from "react";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { MailFallback } from "./mail-fallback";
import { fmtRich } from "./rich-text";
import { useI18n } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";

export const CONTACT_SUBJECTS = ["Bestellung", "Lieferung", "Firmenkunden", "Sonstiges"] as const;
export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

/** The subject values are sent to the API as they are; only their labels are translated. */
const SUBJECT_LABEL: Record<ContactSubject, keyof Messages["forms"]["contact"]["subjects"]> = {
  Bestellung: "order",
  Lieferung: "delivery",
  Firmenkunden: "business",
  Sonstiges: "other",
};

interface FormState { name: string; email: string; subject: ContactSubject; orderId: string; message: string; website: string }
type Errors = Partial<Record<keyof FormState, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(f: FormState, t: Messages["forms"]["contact"]["errors"]): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = t.name;
  if (!EMAIL_RE.test(f.email.trim())) e.email = t.email;
  if (!CONTACT_SUBJECTS.includes(f.subject)) e.subject = t.subject;
  if (f.orderId && f.orderId.trim().length > 20) e.orderId = t.orderIdTooLong;
  if (f.message.trim().length < 10) e.message = t.messageTooShort;
  if (f.message.length > 2000) e.message = t.messageTooLong;
  return e;
}

export function ContactForm({ defaultSubject = "Bestellung", className }: { defaultSubject?: ContactSubject; className?: string }) {
  const [form, setForm] = useState<FormState>({ name: "", email: "", subject: defaultSubject, orderId: "", message: "", website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  /** Set when the server could neither store nor mail the message (503 `unavailable`). */
  const [fallbackEmail, setFallbackEmail] = useState<string | null>(null);
  const { m, fmt } = useI18n();
  const t = m.forms.contact;

  const set = <K extends keyof FormState>(key: K) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const showOrderId = form.subject === "Bestellung" || form.subject === "Lieferung";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = validate(form, t.errors);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(), email: form.email.trim(), subject: form.subject,
          orderId: showOrderId && form.orderId.trim() ? form.orderId.trim() : undefined,
          message: form.message.trim(), website: form.website,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; errors?: Errors; code?: string; email?: string } | null;
      if (!res.ok || !data?.ok) {
        if (data?.errors) setErrors(data.errors);
        setFallbackEmail(data?.code === "unavailable" && data.email ? data.email : null);
        setStatus("failed");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("failed");
    }
  };

  if (status === "sent") {
    return (
      <div className={className} role="status" aria-live="polite">
        <div className="rounded-md border border-line bg-white/70 p-8 sm:p-10">
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-success text-ivory"><Check className="size-5" strokeWidth={2.5} aria-hidden /></span>
          <h2 className="display-3 mt-5 text-ink">{t.thanksTitle}</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
            {fmtRich(t.thanksText, { email: <strong className="font-semibold text-ink">{form.email}</strong> })}
          </p>
          <Button variant="link" className="mt-6" onClick={() => { setForm((f) => ({ ...f, message: "", orderId: "" })); setStatus("idle"); }} iconRight={<ArrowRight className="size-4" aria-hidden />}>
            {t.sendAnother}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={className} aria-label={t.formLabel}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label={m.forms.name} name="name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} required />
        <Input label={m.forms.email} name="email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set("email")} error={errors.email} required />
        <Select label={t.subject} name="subject" value={form.subject} onChange={set("subject")} error={errors.subject}>
          {CONTACT_SUBJECTS.map((s) => <option key={s} value={s}>{t.subjects[SUBJECT_LABEL[s]]}</option>)}
        </Select>
        {showOrderId && (
          <Input label={m.forms.orderNumber} name="orderId" optional placeholder="BQ-XXXXXX" autoComplete="off" value={form.orderId} onChange={set("orderId")} error={errors.orderId} hint={t.orderNumberHint} />
        )}
        <Textarea label={m.forms.message} name="message" rows={6} maxLength={2000} value={form.message} onChange={set("message")} error={errors.message} className="sm:col-span-2" required hint={fmt(m.forms.charCount, { count: form.message.length, max: 2000 })} />
        {/* Honeypot – hidden from people, filled by bots. */}
        <div className="hidden" aria-hidden>
          <label htmlFor="contact-website">{m.forms.honeypot}</label>
          <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
        </div>
      </div>

      {status === "failed" && fallbackEmail && (
        <MailFallback
          className="mt-5"
          email={fallbackEmail}
          subject={fmt(t.mailSubject, { subject: t.subjects[SUBJECT_LABEL[form.subject]] })}
          body={[form.message.trim(), "", `${m.forms.name}: ${form.name.trim()}`, showOrderId && form.orderId.trim() ? `${m.forms.orderNumber}: ${form.orderId.trim()}` : ""].filter((l, i) => i < 2 || l).join("\n")}
        />
      )}
      {status === "failed" && !fallbackEmail && (
        <p role="alert" className="mt-5 rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-danger">
          {t.failed}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-[12px] leading-relaxed text-ink-muted">
          {t.consent}
        </p>
        <Button type="submit" size="lg" loading={status === "sending"} iconRight={<ArrowRight className="size-4" aria-hidden />}>
          {t.submit}
        </Button>
      </div>
    </form>
  );
}
