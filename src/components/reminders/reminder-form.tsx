"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { rich } from "@/components/checkout/rich-text";
import type { Messages } from "@/i18n/messages";
import { events, track } from "@/components/analytics/track";

export interface OccasionOption { slug: string; name: string }

const CUSTOM = "eigener";
/** Month names come from `reminders.form.months` (by key). */
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;
/** Label and hint come from `reminders.form.lead` (by key). */
const LEAD_OPTIONS = [
  { value: 3, key: "days3" },
  { value: 7, key: "days7" },
  { value: 14, key: "days14" },
] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface FormState {
  email: string; occasion: string; customOccasion: string; personName: string;
  day: string; month: string; yearly: boolean; leadDays: 3 | 7 | 14; consent: boolean; website: string;
}
type Errors = Partial<Record<keyof FormState, string>>;

function daysInMonth(month: number) {
  return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 31;
}

function validate(f: FormState, t: Messages["reminders"]["form"]["errors"]): Errors {
  const e: Errors = {};
  if (!EMAIL_RE.test(f.email.trim())) e.email = t.email;
  if (!f.occasion) e.occasion = t.occasion;
  if (f.occasion === CUSTOM && f.customOccasion.trim().length < 2) e.customOccasion = t.customOccasion;
  const m = Number(f.month);
  const d = Number(f.day);
  if (!(m >= 1 && m <= 12)) e.month = t.month;
  if (!(d >= 1 && d <= daysInMonth(m))) e.day = t.day;
  if (!f.consent) e.consent = t.consent;
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
  const { m, fmt, locale } = useI18n();
  const t = m.reminders.form;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const onText = (key: keyof FormState) => (e: { target: { value: string } }) => set(key, e.target.value as never);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validate(form, t.errors);
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
          consent: form.consent, website: form.website, locale,
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
      // The slug of the chosen occasion, or "eigener" – never the free text of a custom occasion.
      track(events.reminderCreated, { occasion_type: form.occasion });
    } catch {
      setStatus("failed");
    }
  };

  if (status === "sent") {
    return (
      <div className={className} role="status" aria-live="polite">
        <div className="rounded-md border border-line bg-white/70 p-8 sm:p-10">
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-forest text-ivory"><MailCheck className="size-5" aria-hidden /></span>
          <h2 className="display-3 mt-5 text-ink">{t.sentTitle}</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
            {rich(t.sentText, { email: <strong className="font-semibold text-ink">{form.email}</strong> })}
          </p>
          <p className="mt-3 text-[13px] text-ink-soft">{t.sentHint}</p>
          <Button variant="link" className="mt-6" onClick={() => { setForm((f) => ({ ...f, personName: "", day: "", month: "", customOccasion: "", consent: false })); setStatus("idle"); }} iconRight={<ArrowRight className="size-4" aria-hidden />}>
            {t.another}
          </Button>
        </div>
      </div>
    );
  }

  const monthNum = Number(form.month) || 0;
  const maxDay = monthNum ? daysInMonth(monthNum) : 31;

  return (
    <form onSubmit={submit} noValidate className={className} aria-label={t.label}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Select label={t.occasion} name="occasion" value={form.occasion} onChange={onText("occasion")} error={errors.occasion}>
          {occasions.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
          <option value={CUSTOM}>{t.customOption}</option>
        </Select>
        {form.occasion === CUSTOM ? (
          <Input label={t.customOccasion} name="customOccasion" maxLength={60} placeholder={t.customPlaceholder} value={form.customOccasion} onChange={onText("customOccasion")} error={errors.customOccasion} required />
        ) : (
          <Input label={t.person} name="personName" optional maxLength={60} placeholder={t.personPlaceholder} autoComplete="off" value={form.personName} onChange={onText("personName")} error={errors.personName} />
        )}
        {form.occasion === CUSTOM && (
          <Input label={t.person} name="personName" optional maxLength={60} placeholder={t.personPlaceholder} autoComplete="off" value={form.personName} onChange={onText("personName")} error={errors.personName} className="sm:col-span-2" />
        )}

        <Select label={t.day} name="day" value={form.day} onChange={onText("day")} error={errors.day}>
          <option value="">{t.chooseDay}</option>
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{fmt(t.dayOption, { day: d })}</option>)}
        </Select>
        <Select label={t.month} name="month" value={form.month} onChange={onText("month")} error={errors.month}>
          <option value="">{t.chooseMonth}</option>
          {MONTHS.map((k, i) => <option key={k} value={i + 1}>{t.months[k]}</option>)}
        </Select>

        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-[13px] font-semibold text-ink">{t.when}</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {LEAD_OPTIONS.map((o) => {
              const active = form.leadDays === o.value;
              return (
                <label key={o.value} className={cn("flex cursor-pointer flex-col rounded-md border px-4 py-3 transition-colors", active ? "border-forest bg-white" : "border-line bg-white/60 hover:border-stone")}>
                  <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                    <input type="radio" name="leadDays" value={o.value} checked={active} onChange={() => set("leadDays", o.value)} className="accent-forest" />
                    {t.lead[o.key].label}
                  </span>
                  <span className="mt-0.5 pl-6 text-[12.5px] text-ink-soft">{t.lead[o.key].hint}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Input label={t.email} name="email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={onText("email")} error={errors.email} required className="sm:col-span-2" />

        <div className="flex flex-col gap-3 sm:col-span-2">
          <Checkbox name="yearly" checked={form.yearly} onChange={(e) => set("yearly", e.target.checked)} label={t.yearly} />
          <Checkbox name="consent" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} label={<>{t.consent}</>} />
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
          {failMessage ?? t.errors.saveFailed}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-[12px] leading-relaxed text-ink-soft">
          {t.privacy}
        </p>
        <Button type="submit" size="lg" loading={status === "sending"} iconRight={<ArrowRight className="size-4" aria-hidden />}>
          {t.submit}
        </Button>
      </div>
    </form>
  );
}
