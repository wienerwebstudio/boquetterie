"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "@/components/ui/link";
import { ArrowRight, Check, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, PhoneInput, Select, Textarea } from "@/components/ui/input";
import { MailFallback } from "@/components/content/mail-fallback";
import { fmtRich } from "@/components/content/rich-text";
import { routes } from "@/lib/urls";
import { cn } from "@/lib/format";
import {
  BUDGET_TOPICS, CLIENT_PHOTO_MAX_SIDE, CUSTOM_REQUEST_BUDGETS, CUSTOM_REQUEST_LIMITS, CUSTOM_REQUEST_TOPICS, MAX_REQUEST_PHOTO_BYTES, REQUEST_PHOTO_ACCEPT,
  validateCustomRequest, type CustomRequestBudget, type CustomRequestErrors, type CustomRequestTopic,
} from "@/lib/custom-requests-core";
import { useI18n } from "@/i18n/client";

interface FormState {
  topics: CustomRequestTopic[];
  product: string;
  date: string;
  time: string;
  flexible: boolean;
  place: string;
  budget: CustomRequestBudget | "";
  message: string;
  name: string;
  email: string;
  phone: string;
  consent: boolean;
  website: string;
}

/** Scales a photo down in the browser (keeps the request small); falls back to the original file. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, CLIENT_PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/** `today`: shop date (YYYY-MM-DD, Vienna) – earliest wish date; the server checks it again. */
export function CustomRequestForm({ products, initialProduct, today }: { products: { slug: string; name: string }[]; initialProduct: string; today: string }) {
  const { m, fmt, locale } = useI18n();
  const t = m.inquiry;
  const initial: FormState = {
    topics: initialProduct ? ["product"] : [], product: initialProduct, date: "", time: "", flexible: false, place: "",
    budget: "", message: "", name: "", email: "", phone: "", consent: false, website: "",
  };
  const [form, setForm] = useState<FormState>(initial);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<CustomRequestErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [sentId, setSentId] = useState("");
  const [fallbackEmail, setFallbackEmail] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const showBudget = form.topics.some((x) => BUDGET_TOPICS.includes(x));
  const err = (k: keyof CustomRequestErrors) => (errors[k] ? t.errors[errors[k]!] : undefined);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const toggleTopic = (topic: CustomRequestTopic) =>
    setForm((f) => ({ ...f, topics: f.topics.includes(topic) ? f.topics.filter((x) => x !== topic) : CUSTOM_REQUEST_TOPICS.filter((x) => x === topic || f.topics.includes(x)) }));

  const pickPhoto = (file: File | undefined) => {
    setErrors((e) => ({ ...e, photo: undefined }));
    if (!file) return;
    if (file.size > MAX_REQUEST_PHOTO_BYTES) { setErrors((e) => ({ ...e, photo: "photoSize" })); return; }
    if (/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) { setErrors((e) => ({ ...e, photo: "photoHeic" })); return; }
    if (file.type && !REQUEST_PHOTO_ACCEPT.split(",").includes(file.type)) { setErrors((e) => ({ ...e, photo: "photoType" })); return; }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };
  const removePhoto = () => {
    setPhoto(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const fields = {
      name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), topics: form.topics, productSlug: form.product,
      date: form.date, time: form.time.trim(), flexible: form.flexible, place: form.place.trim(), budget: showBudget ? form.budget : "",
      message: form.message.trim(), consent: form.consent, locale, website: form.website,
    } as const;
    const nextErrors = { ...validateCustomRequest(fields, today || undefined), ...(errors.photo ? { photo: errors.photo } : {}) };
    setErrors(nextErrors);
    if (Object.keys(nextErrors).some((k) => nextErrors[k as keyof CustomRequestErrors])) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    setStatus("sending");
    try {
      const body = new FormData();
      for (const [k, v] of Object.entries(fields)) {
        if (k === "topics") fields.topics.forEach((x) => body.append("topics", x));
        else if (k === "productSlug") body.set("product", String(v));
        else if (typeof v === "boolean") { if (v) body.set(k, "true"); }
        else if (v) body.set(k, String(v));
      }
      body.set("website", form.website);
      if (photo) body.set("photo", await shrink(photo), "foto.jpg");
      const res = await fetch("/api/custom-request", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; id?: string; errors?: CustomRequestErrors; code?: string; email?: string } | null;
      if (!res.ok || !data?.ok) {
        if (data?.errors) setErrors(data.errors);
        setFallbackEmail(data?.code === "unavailable" && data.email ? data.email : null);
        setStatus(data?.errors ? "idle" : "failed");
        return;
      }
      setSentId(data.id ?? "");
      setStatus("sent");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setStatus("failed");
    }
  };

  if (status === "sent") {
    return (
      <div role="status" aria-live="polite" data-testid="request-success">
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-success text-ivory"><Check className="size-5" strokeWidth={2.5} aria-hidden /></span>
        <h2 className="display-3 mt-5 text-ink">{t.thanksTitle}</h2>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
          {fmtRich(t.thanksText, { id: <strong className="font-semibold text-ink" dir="ltr">{sentId}</strong>, email: <strong className="font-semibold text-ink" dir="ltr">{form.email}</strong> })}
        </p>
        <Button variant="link" className="mt-6" onClick={() => { setForm(initial); removePhoto(); setStatus("idle"); }} iconRight={<ArrowRight className="size-4 rtl:rotate-180" aria-hidden />}>
          {t.sendAnother}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate aria-label={t.formLabel} className="space-y-8">
      <fieldset>
        <legend className="text-[15px] font-semibold text-ink">{t.topicsLegend}</legend>
        <p className="mt-1 text-[13px] text-ink-muted">{t.topicsHint}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {CUSTOM_REQUEST_TOPICS.map((topic) => {
            const on = form.topics.includes(topic);
            return (
              <label key={topic} className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-[13.5px] leading-snug transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest",
                on ? "border-forest bg-forest text-ivory" : "border-line-strong bg-white text-ink hover:border-forest/60",
              )}>
                <input type="checkbox" name="topics" value={topic} checked={on} onChange={() => toggleTopic(topic)} className="sr-only" />
                {on && <Check className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />}
                {t.topics[topic]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select label={t.product} name="product" value={form.product} onChange={(e) => set("product", e.target.value)} className="sm:col-span-2">
          <option value="">{t.productOpen}</option>
          {products.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
        </Select>
        <Input label={t.date} name="date" type="date" optional min={today || undefined} value={form.date} onChange={(e) => set("date", e.target.value)} error={err("date")} />
        <Input label={t.time} name="time" optional maxLength={CUSTOM_REQUEST_LIMITS.time} placeholder={t.timePlaceholder} value={form.time} onChange={(e) => set("time", e.target.value)} />
        <Checkbox label={t.flexible} name="flexible" checked={form.flexible} onChange={(e) => set("flexible", e.target.checked)} className="sm:col-span-2" />
        <Input label={t.place} name="place" optional maxLength={CUSTOM_REQUEST_LIMITS.place} placeholder={t.placePlaceholder} hint={t.placeHint} value={form.place} onChange={(e) => set("place", e.target.value)} className="sm:col-span-2" />
        {showBudget && (
          <Select label={`${t.budget} ${m.ui.optional}`} name="budget" value={form.budget} onChange={(e) => set("budget", e.target.value as CustomRequestBudget | "")} className="sm:col-span-2">
            <option value="">–</option>
            {CUSTOM_REQUEST_BUDGETS.map((b) => <option key={b} value={b}>{t.budgets[b]}</option>)}
          </Select>
        )}
        <Textarea label={t.message} name="message" required rows={6} maxLength={CUSTOM_REQUEST_LIMITS.message} placeholder={t.messagePlaceholder} value={form.message} onChange={(e) => set("message", e.target.value)} error={err("message")} hint={fmt(m.forms.charCount, { count: form.message.length, max: CUSTOM_REQUEST_LIMITS.message })} className="sm:col-span-2" />

        <div className="sm:col-span-2">
          <p className="text-[13px] font-semibold text-ink">{t.photo} <span className="font-normal text-ink-muted">{m.ui.optional}</span></p>
          <input ref={fileRef} id="request-photo" type="file" accept={REQUEST_PHOTO_ACCEPT} className="peer sr-only" aria-describedby="request-photo-hint" onChange={(e) => pickPhoto(e.target.files?.[0])} data-testid="request-photo-input" />
          {preview ? (
            <div className="mt-2 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img src={preview} alt="" className="size-20 rounded-md border border-line object-cover" />
              <Button type="button" variant="ghost" size="sm" onClick={removePhoto} icon={<X className="size-4" aria-hidden />}>{t.photoRemove}</Button>
            </div>
          ) : (
            <label htmlFor="request-photo" className="mt-2 inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed border-line-strong bg-white px-4 text-[14px] text-ink transition-colors hover:border-forest peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest">
              <ImagePlus className="size-4 text-forest" aria-hidden /> {t.photoChoose}
            </label>
          )}
          {err("photo") ? (
            <p role="alert" className="mt-1.5 text-[13px] text-danger">{err("photo")}</p>
          ) : (
            <p id="request-photo-hint" className="mt-1.5 text-[13px] text-ink-muted">{t.photoHint}</p>
          )}
        </div>
      </div>

      <fieldset className="border-t border-line pt-6">
        <legend className="sr-only">{t.contactTitle}</legend>
        <p aria-hidden className="mb-4 text-[15px] font-semibold text-ink">{t.contactTitle}</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label={m.forms.name} name="name" autoComplete="name" required maxLength={CUSTOM_REQUEST_LIMITS.name} value={form.name} onChange={(e) => set("name", e.target.value)} error={err("name")} />
          <Input label={m.forms.email} name="email" type="email" inputMode="email" autoComplete="email" required dir="ltr" maxLength={CUSTOM_REQUEST_LIMITS.email} value={form.email} onChange={(e) => set("email", e.target.value)} error={err("email")} />
          <PhoneInput label={t.phone} autoComplete="tel" optional maxLength={CUSTOM_REQUEST_LIMITS.phone} value={form.phone} onChange={(v) => set("phone", v)} error={err("phone")} className="sm:col-span-2" />
        </div>
        {/* Honeypot – hidden from people, filled by bots. */}
        <div className="hidden" aria-hidden>
          <label htmlFor="request-website">{m.forms.honeypot}</label>
          <input id="request-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
        </div>
      </fieldset>

      <div>
        <Checkbox
          name="consent"
          checked={form.consent}
          onChange={(e) => set("consent", e.target.checked)}
          aria-invalid={Boolean(errors.consent) || undefined}
          aria-describedby={errors.consent ? "request-consent-error" : undefined}
          label={fmtRich(t.consent, { privacyLink: <Link href={routes.legal.privacy} target="_blank" className="text-forest underline underline-offset-4">{t.privacyLink}</Link> })}
        />
        {errors.consent && <p id="request-consent-error" role="alert" className="mt-1.5 text-[13px] text-danger">{err("consent")}</p>}
      </div>

      {status === "failed" && fallbackEmail && (
        <MailFallback email={fallbackEmail} subject={t.mailSubject} body={[form.message.trim(), "", `${m.forms.name}: ${form.name.trim()}`].join("\n")} />
      )}
      {status === "failed" && !fallbackEmail && (
        <p role="alert" className="rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-danger">{t.failed}</p>
      )}

      <Button type="submit" size="lg" full loading={status === "sending"} iconRight={<ArrowRight className="size-4 rtl:rotate-180" aria-hidden />}>
        {t.submit}
      </Button>
    </form>
  );
}
