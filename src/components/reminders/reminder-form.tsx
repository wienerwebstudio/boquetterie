"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/format";

export interface OccasionOption { slug: string; name: string }

const CUSTOM = "eigener";
const MONTHS = ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const LEAD_OPTIONS: { value: 3 | 7 | 14; label: string; hint: string }[] = [
  { value: 3, label: "3 Tage vorher", hint: "Für Spontane" },
  { value: 7, label: "1 Woche vorher", hint: "Unsere Empfehlung" },
  { value: 14, label: "2 Wochen vorher", hint: "Für Planer:innen" },
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface FormState {
  email: string; occasion: string; customOccasion: string; personName: string;
  day: string; month: string; yearly: boolean; leadDays: 3 | 7 | 14; consent: boolean; website: string;
}
type Errors = Partial<Record<keyof FormState, string>>;

function daysInMonth(month: number) {
  return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 31;
}

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!EMAIL_RE.test(f.email.trim())) e.email = "Bitte gib eine gültige E-Mail-Adresse an.";
  if (!f.occasion) e.occasion = "Bitte wähle einen Anlass.";
  if (f.occasion === CUSTOM && f.customOccasion.trim().length < 2) e.customOccasion = "Bitte gib an, woran wir dich erinnern sollen.";
  const m = Number(f.month);
  const d = Number(f.day);
  if (!(m >= 1 && m <= 12)) e.month = "Bitte wähle einen Monat.";
  if (!(d >= 1 && d <= daysInMonth(m))) e.day = "Bitte prüfe den Tag.";
  if (!f.consent) e.consent = "Bitte bestätige, dass wir dir Erinnerungen schicken dürfen.";
  return e;
}

export function ReminderForm({ occasions, className }: { occasions: OccasionOption[]; className?: string }) {
  const [form, setForm] = useState<FormState>({
    email: "", occasion: occasions[0]?.slug ?? CUSTOM, customOccasion: "", personName: "",
    day: "", month: "", yearly: true, leadDays: 7, consent: false, website: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [failMessage, setFailMessage] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const onText = (key: keyof FormState) => (e: { target: { value: string } }) => set(key, e.target.value as never);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    setStatus("sending");
    setFailMessage(null);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(), occasion: form.occasion,
          customOccasion: form.occasion === CUSTOM ? form.customOccasion.trim() : undefined,
          personName: form.personName.trim() || undefined,
          day: Number(form.day), month: Number(form.month), yearly: form.yearly, leadDays: form.leadDays,
          consent: form.consent, website: form.website,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; errors?: Errors; message?: string } | null;
      if (!res.ok || !data?.ok) {
        if (data?.errors) setErrors(data.errors);
        setFailMessage(data?.message ?? null);
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
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-forest text-ivory"><MailCheck className="size-5" aria-hidden /></span>
          <h2 className="display-3 mt-5 text-ink">Fast fertig – bitte bestätigen.</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
            Wir haben dir eine E-Mail an <strong className="font-semibold text-ink">{form.email}</strong> geschickt. Klick dort auf „Erinnerung bestätigen“ – erst dann ist sie aktiv.
          </p>
          <p className="mt-3 text-[13px] text-ink-soft">Keine E-Mail? Schau bitte im Spam-Ordner nach.</p>
          <Button variant="link" className="mt-6" onClick={() => { setForm((f) => ({ ...f, personName: "", day: "", month: "", customOccasion: "", consent: false })); setStatus("idle"); }} iconRight={<ArrowRight className="size-4" aria-hidden />}>
            Weitere Erinnerung anlegen
          </Button>
        </div>
      </div>
    );
  }

  const monthNum = Number(form.month) || 0;
  const maxDay = monthNum ? daysInMonth(monthNum) : 31;

  return (
    <form onSubmit={submit} noValidate className={className} aria-label="Erinnerung anlegen">
      <div className="grid gap-5 sm:grid-cols-2">
        <Select label="Anlass" name="occasion" value={form.occasion} onChange={onText("occasion")} error={errors.occasion}>
          {occasions.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
          <option value={CUSTOM}>Eigener Anlass</option>
        </Select>
        {form.occasion === CUSTOM ? (
          <Input label="Woran sollen wir erinnern?" name="customOccasion" maxLength={60} placeholder="z. B. Namenstag, Einzug" value={form.customOccasion} onChange={onText("customOccasion")} error={errors.customOccasion} required />
        ) : (
          <Input label="Für wen?" name="personName" optional maxLength={60} placeholder="z. B. Mama, Lisa" autoComplete="off" value={form.personName} onChange={onText("personName")} error={errors.personName} />
        )}
        {form.occasion === CUSTOM && (
          <Input label="Für wen?" name="personName" optional maxLength={60} placeholder="z. B. Mama, Lisa" autoComplete="off" value={form.personName} onChange={onText("personName")} error={errors.personName} className="sm:col-span-2" />
        )}

        <Select label="Tag" name="day" value={form.day} onChange={onText("day")} error={errors.day}>
          <option value="">Tag wählen</option>
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}.</option>)}
        </Select>
        <Select label="Monat" name="month" value={form.month} onChange={onText("month")} error={errors.month}>
          <option value="">Monat wählen</option>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </Select>

        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-[13px] font-semibold text-ink">Wann sollen wir dich erinnern?</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {LEAD_OPTIONS.map((o) => {
              const active = form.leadDays === o.value;
              return (
                <label key={o.value} className={cn("flex cursor-pointer flex-col rounded-md border px-4 py-3 transition-colors", active ? "border-forest bg-white" : "border-line bg-white/60 hover:border-stone")}>
                  <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                    <input type="radio" name="leadDays" value={o.value} checked={active} onChange={() => set("leadDays", o.value)} className="accent-forest" />
                    {o.label}
                  </span>
                  <span className="mt-0.5 pl-6 text-[12.5px] text-ink-soft">{o.hint}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Input label="Deine E-Mail" name="email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={onText("email")} error={errors.email} required className="sm:col-span-2" />

        <div className="flex flex-col gap-3 sm:col-span-2">
          <Checkbox name="yearly" checked={form.yearly} onChange={(e) => set("yearly", e.target.checked)} label="Jedes Jahr erinnern" />
          <Checkbox name="consent" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} label={<>Ja, schickt mir Erinnerungs-E-Mails zu diesem Anlass. Ich kann sie jederzeit über den Link in der E-Mail löschen.</>} />
          {errors.consent && <p role="alert" className="text-[13px] text-danger">{errors.consent}</p>}
        </div>

        {/* Honeypot – hidden from people, filled by bots. */}
        <div className="hidden" aria-hidden>
          <label htmlFor="reminder-website">Website</label>
          <input id="reminder-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={onText("website")} />
        </div>
      </div>

      {status === "failed" && (
        <p role="alert" className="mt-5 rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-danger">
          {failMessage ?? "Die Erinnerung konnte nicht gespeichert werden. Bitte prüfe deine Angaben und versuch es noch einmal."}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-[12px] leading-relaxed text-ink-soft">
          Wir verwenden deine E-Mail-Adresse nur für diese Erinnerung. Details in der Datenschutzerklärung.
        </p>
        <Button type="submit" size="lg" loading={status === "sending"} iconRight={<ArrowRight className="size-4" aria-hidden />}>
          Erinnerung anlegen
        </Button>
      </div>
    </form>
  );
}
