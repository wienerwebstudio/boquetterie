"use client";
import { useState, type FormEvent } from "react";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";

export const CONTACT_SUBJECTS = ["Bestellung", "Lieferung", "Firmenkunden", "Sonstiges"] as const;
export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

interface FormState { name: string; email: string; subject: ContactSubject; orderId: string; message: string; website: string }
type Errors = Partial<Record<keyof FormState, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = "Bitte gib deinen Namen an.";
  if (!EMAIL_RE.test(f.email.trim())) e.email = "Bitte gib eine gültige E-Mail-Adresse an.";
  if (!CONTACT_SUBJECTS.includes(f.subject)) e.subject = "Bitte wähle ein Thema.";
  if (f.orderId && f.orderId.trim().length > 20) e.orderId = "Die Bestellnummer ist zu lang.";
  if (f.message.trim().length < 10) e.message = "Bitte beschreibe dein Anliegen (mindestens 10 Zeichen).";
  if (f.message.length > 2000) e.message = "Die Nachricht darf höchstens 2000 Zeichen lang sein.";
  return e;
}

export function ContactForm({ defaultSubject = "Bestellung", className }: { defaultSubject?: ContactSubject; className?: string }) {
  const [form, setForm] = useState<FormState>({ name: "", email: "", subject: defaultSubject, orderId: "", message: "", website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const set = <K extends keyof FormState>(key: K) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const showOrderId = form.subject === "Bestellung" || form.subject === "Lieferung";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = validate(form);
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
      const data = (await res.json().catch(() => null)) as { ok?: boolean; errors?: Errors } | null;
      if (!res.ok || !data?.ok) {
        if (data?.errors) setErrors(data.errors);
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
          <h2 className="display-3 mt-5 text-ink">Danke für deine Nachricht.</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
            Wir haben deine Anfrage erhalten und melden uns so schnell wie möglich per E-Mail an <strong className="font-semibold text-ink">{form.email}</strong>.
          </p>
          <Button variant="link" className="mt-6" onClick={() => { setForm((f) => ({ ...f, message: "", orderId: "" })); setStatus("idle"); }} iconRight={<ArrowRight className="size-4" aria-hidden />}>
            Weitere Nachricht senden
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={className} aria-label="Kontaktformular">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Name" name="name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} required />
        <Input label="E-Mail" name="email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set("email")} error={errors.email} required />
        <Select label="Thema" name="subject" value={form.subject} onChange={set("subject")} error={errors.subject}>
          {CONTACT_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        {showOrderId && (
          <Input label="Bestellnummer" name="orderId" optional placeholder="BQ-XXXXXX" autoComplete="off" value={form.orderId} onChange={set("orderId")} error={errors.orderId} hint="Findest du in deiner Bestellbestätigung." />
        )}
        <Textarea label="Nachricht" name="message" rows={6} maxLength={2000} value={form.message} onChange={set("message")} error={errors.message} className="sm:col-span-2" required hint={`${form.message.length}/2000 Zeichen`} />
        {/* Honeypot – hidden from people, filled by bots. */}
        <div className="hidden" aria-hidden>
          <label htmlFor="contact-website">Website</label>
          <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
        </div>
      </div>

      {status === "failed" && (
        <p role="alert" className="mt-5 rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-danger">
          Die Nachricht konnte nicht gesendet werden. Bitte versuch es noch einmal oder schreib uns direkt per E-Mail.
        </p>
      )}

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-[12px] leading-relaxed text-ink-soft">
          Mit dem Absenden stimmst du zu, dass wir deine Angaben zur Bearbeitung der Anfrage verwenden. Details in der Datenschutzerklärung.
        </p>
        <Button type="submit" size="lg" loading={status === "sending"} iconRight={<ArrowRight className="size-4" aria-hidden />}>
          Nachricht senden
        </Button>
      </div>
    </form>
  );
}
