"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { routes } from "@/lib/urls";
import { events, track } from "@/components/analytics/track";
import { BUSINESS_NEEDS, LIMITS, validateBusinessInquiry, type BusinessInquiryErrors, type BusinessNeed } from "@/app/api/business-inquiry/schema";

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

const INITIAL: FormState = { company: "", contact: "", email: "", phone: "", location: "", need: "", message: "", consent: false, website: "" };

export function BusinessInquiryForm({ className }: { className?: string }) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<BusinessInquiryErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

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
      const data = (await res.json().catch(() => null)) as { ok?: boolean; errors?: BusinessInquiryErrors } | null;
      if (!res.ok || !data?.ok) {
        if (data?.errors) setErrors(data.errors);
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
          <h2 className="display-3 mt-5 text-ink">Danke für deine Anfrage.</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
            Wir haben alles erhalten und melden uns bei <strong className="font-semibold text-ink">{form.contact}</strong> per E-Mail an{" "}
            <strong className="font-semibold text-ink">{form.email}</strong>.
          </p>
          <Button variant="link" className="mt-6" onClick={() => { setForm(INITIAL); setStatus("idle"); }} iconRight={<ArrowRight className="size-4" aria-hidden />}>
            Weitere Anfrage senden
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={className} aria-label="Anfrage für Firmenkunden">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Firma" name="company" autoComplete="organization" maxLength={LIMITS.company} value={form.company} onChange={set("company")} error={errors.company} required />
        <Input label="Ansprechperson" name="contact" autoComplete="name" maxLength={LIMITS.contact} value={form.contact} onChange={set("contact")} error={errors.contact} required />
        <Input label="E-Mail" name="email" type="email" autoComplete="email" inputMode="email" maxLength={LIMITS.email} value={form.email} onChange={set("email")} error={errors.email} required />
        <Input label="Telefon" name="phone" type="tel" optional autoComplete="tel" inputMode="tel" maxLength={LIMITS.phone} value={form.phone} onChange={set("phone")} error={errors.phone} />
        <Input label="Standort / PLZ" name="location" autoComplete="postal-code" maxLength={LIMITS.location} placeholder="z. B. 1070 Wien" value={form.location} onChange={set("location")} error={errors.location} required />
        <Select label="Bedarf" name="need" value={form.need} onChange={set("need")} error={errors.need} required>
          <option value="" disabled>Bitte wählen</option>
          {BUSINESS_NEEDS.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
        </Select>
        <Textarea
          label="Nachricht"
          name="message"
          rows={6}
          maxLength={LIMITS.message}
          value={form.message}
          onChange={set("message")}
          error={errors.message}
          className="sm:col-span-2"
          required
          placeholder="Wie viele Standorte, welche Räume, welcher Rhythmus – und was dir sonst noch wichtig ist."
          hint={`${form.message.length}/${LIMITS.message} Zeichen`}
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
              <>
                Ich bin einverstanden, dass meine Angaben zur Bearbeitung der Anfrage gespeichert und verwendet werden. Details in der{" "}
                <Link href={routes.legal.privacy} className="text-forest underline underline-offset-4">Datenschutzerklärung</Link>.
              </>
            }
          />
          {errors.consent && <p role="alert" className="mt-2 text-[13px] text-danger">{errors.consent}</p>}
        </div>
        {/* Honeypot – hidden from people, filled by bots. */}
        <div className="hidden" aria-hidden>
          <label htmlFor="business-website">Website</label>
          <input id="business-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
        </div>
      </div>

      {status === "failed" && (
        <p role="alert" className="mt-5 rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-danger">
          Die Anfrage konnte nicht gesendet werden. Bitte versuch es noch einmal oder schreib uns direkt per E-Mail.
        </p>
      )}

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <Button type="submit" size="lg" loading={status === "sending"} iconRight={<ArrowRight className="size-4" aria-hidden />}>
          Anfrage senden
        </Button>
      </div>
    </form>
  );
}
