"use client";
import { useState, type FormEvent } from "react";
import Link from "@/components/ui/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { routes } from "@/lib/urls";
import { MailFallback } from "@/components/content/mail-fallback";
import { events, track } from "@/components/analytics/track";
import { BUSINESS_NEEDS, LIMITS, validateBusinessInquiry, type BusinessInquiryErrors, type BusinessNeed } from "@/app/api/business-inquiry/schema";
import { fmtRich } from "@/components/content/rich-text";
import { useI18n } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";

interface FormState {
  company: string;
  contact: string;
  email: string;
  phone: string;
  location: string;
  need: BusinessNeed | "";
  message: string;
  consent: boolean;
  website: string; // honeypot
}

/** Option values stay as they are (the API checks them); only the labels are translated. */
const NEED_LABEL: Record<BusinessNeed, keyof Messages["forms"]["business"]["needs"]> = {
  abo: "subscription",
  einmalig: "oneOff",
  event: "event",
  geschenke: "gifts",
};

const INITIAL: FormState = { company: "", contact: "", email: "", phone: "", location: "", need: "", message: "", consent: false, website: "" };

export function BusinessInquiryForm({ className }: { className?: string }) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<BusinessInquiryErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  /** Set when the server could neither store nor mail the inquiry (503 `unavailable`). */
  const [fallbackEmail, setFallbackEmail] = useState<string | null>(null);
  const { m, fmt } = useI18n();
  const t = m.forms.business;
  /** The shared validation (also used by the API) speaks German; its messages are looked up per field. */
  const errorText = (field: keyof BusinessInquiryErrors) => (errors[field] ? t.errors[field] : undefined);

  const set = <K extends keyof FormState>(key: K) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key as keyof BusinessInquiryErrors]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      company: form.company, contact: form.contact, email: form.email, phone: form.phone || undefined,
      location: form.location, need: form.need, message: form.message, consent: form.consent, website: form.website,
    };
    const { errors: nextErrors } = validateBusinessInquiry(payload);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("sending");
    try {
      const res = await fetch("/api/business-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; errors?: BusinessInquiryErrors; code?: string; email?: string } | null;
      if (!res.ok || !data?.ok) {
        if (data?.errors) setErrors(data.errors);
        setFallbackEmail(data?.code === "unavailable" && data.email ? data.email : null);
        setStatus("failed");
        return;
      }
      setStatus("sent");
      track(events.businessInquiry, { need: form.need });
    } catch {
      setStatus("failed");
    }
  };

  if (status === "sent") {
    return (
      <div className={className} role="status" aria-live="polite">
        <div className="rounded-md border border-line bg-white/70 p-8 sm:p-10">
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-success text-ivory">
            <Check className="size-5" strokeWidth={2.5} aria-hidden />
          </span>
          <h2 className="display-3 mt-5 text-ink">{t.thanksTitle}</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
            {fmtRich(t.thanksText, {
              contact: <strong className="font-semibold text-ink">{form.contact}</strong>,
              email: <strong className="font-semibold text-ink">{form.email}</strong>,
            })}
          </p>
          <Button variant="link" className="mt-6" onClick={() => { setForm(INITIAL); setStatus("idle"); }} iconRight={<ArrowRight className="size-4" aria-hidden />}>
            {t.sendAnother}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={className} aria-label={t.formLabel}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label={t.company} name="company" autoComplete="organization" maxLength={LIMITS.company} value={form.company} onChange={set("company")} error={errorText("company")} required />
        <Input label={t.contact} name="contact" autoComplete="name" maxLength={LIMITS.contact} value={form.contact} onChange={set("contact")} error={errorText("contact")} required />
        <Input label={m.forms.email} name="email" type="email" autoComplete="email" inputMode="email" maxLength={LIMITS.email} value={form.email} onChange={set("email")} error={errorText("email")} required />
        <Input label={t.phone} name="phone" type="tel" optional autoComplete="tel" inputMode="tel" maxLength={LIMITS.phone} value={form.phone} onChange={set("phone")} error={errorText("phone")} />
        <Input label={t.location} name="location" autoComplete="postal-code" maxLength={LIMITS.location} placeholder={t.locationPlaceholder} value={form.location} onChange={set("location")} error={errorText("location")} required />
        <Select label={t.need} name="need" value={form.need} onChange={set("need")} error={errorText("need")} required>
          <option value="" disabled>{t.pleaseChoose}</option>
          {BUSINESS_NEEDS.map((n) => <option key={n.value} value={n.value}>{t.needs[NEED_LABEL[n.value]]}</option>)}
        </Select>
        <Textarea
          label={m.forms.message}
          name="message"
          rows={6}
          maxLength={LIMITS.message}
          value={form.message}
          onChange={set("message")}
          error={errorText("message")}
          className="sm:col-span-2"
          required
          placeholder={t.messagePlaceholder}
          hint={fmt(m.forms.charCount, { count: form.message.length, max: LIMITS.message })}
        />
        <div className="sm:col-span-2">
          <Checkbox
            name="consent"
            checked={form.consent}
            onChange={(e) => {
              setForm((f) => ({ ...f, consent: e.target.checked }));
              if (errors.consent) setErrors((prev) => ({ ...prev, consent: undefined }));
            }}
            label={
              fmtRich(t.consent, {
                privacyLink: <Link href={routes.legal.privacy} className="text-forest underline underline-offset-4">{t.privacyLink}</Link>,
              })
            }
          />
          {errors.consent && <p role="alert" className="mt-2 text-[13px] text-danger">{t.errors.consent}</p>}
        </div>
        {/* Honeypot – hidden from people, filled by bots. */}
        <div className="hidden" aria-hidden>
          <label htmlFor="business-website">{m.forms.honeypot}</label>
          <input id="business-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
        </div>
      </div>

      {status === "failed" && fallbackEmail && (
        <MailFallback
          className="mt-5"
          email={fallbackEmail}
          subject={fmt(t.mailSubject, { company: form.company.trim() })}
          body={[
            form.message.trim(), "",
            `${t.company}: ${form.company.trim()}`,
            `${t.contact}: ${form.contact.trim()}`,
            form.phone.trim() ? `${t.phone}: ${form.phone.trim()}` : "",
            `${t.location}: ${form.location.trim()}`,
            `${t.need}: ${(form.need && t.needs[NEED_LABEL[form.need]]) || form.need}`,
          ].filter((l, i) => i < 2 || l).join("\n")}
        />
      )}
      {status === "failed" && !fallbackEmail && (
        <p role="alert" className="mt-5 rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-danger">
          {t.failed}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <Button type="submit" size="lg" loading={status === "sending"} iconRight={<ArrowRight className="size-4" aria-hidden />}>
          {t.submit}
        </Button>
      </div>
    </form>
  );
}
