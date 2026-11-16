"use client";
import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { MailFallback } from "./mail-fallback";

interface FormState { name: string; email: string; orderId: string; items: string; website: string }
type Errors = Partial<Record<keyof FormState, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = "Bitte gib deinen Namen an.";
  if (!EMAIL_RE.test(f.email.trim())) e.email = "Bitte gib eine gültige E-Mail-Adresse an.";
  if (!/^[A-Za-z0-9-]{4,20}$/.test(f.orderId.trim())) e.orderId = "Bitte gib die Bestellnummer an (z. B. BQ-7K2M9Q).";
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

  const set = <K extends keyof FormState>(key: K) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), orderId: form.orderId.trim(), items: form.items.trim() || undefined, website: form.website }),
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
        <h2 className="display-3 mt-5 text-ink">Dein Widerruf ist eingegangen.</h2>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
          Eingegangen am <strong className="font-semibold text-ink">{receipt.receivedAt}</strong> zur Bestellung{" "}
          <strong className="font-semibold text-ink">{form.orderId.trim().toUpperCase()}</strong>{receipt.id ? ` (Vorgang ${receipt.id})` : ""}.
        </p>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
          {receipt.confirmationSent
            ? <>Die Eingangsbestätigung haben wir an <strong className="font-semibold text-ink">{form.email.trim()}</strong> geschickt.</>
            : <>Die Bestätigungs-E-Mail konnte gerade nicht versendet werden – wir bestätigen den Eingang so schnell wie möglich persönlich. Bitte bewahre diese Seite bis dahin auf (z. B. als Screenshot).</>}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Vertrag widerrufen">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Name" name="name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} required />
        <Input label="E-Mail-Adresse" name="email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set("email")} error={errors.email} required hint="Hierhin schicken wir die Eingangsbestätigung." />
        <Input label="Bestellnummer" name="orderId" placeholder="BQ-XXXXXX" autoComplete="off" value={form.orderId} onChange={set("orderId")} error={errors.orderId} required hint="Steht in deiner Bestellbestätigung." />
        <Textarea
          label="Welche Waren widerrufst du?" name="items" optional rows={3} maxLength={1000}
          placeholder="z. B. den Teddy – leer lassen für alle widerrufbaren Waren der Bestellung"
          value={form.items} onChange={set("items")} error={errors.items} className="sm:col-span-2"
        />
        <div className="hidden" aria-hidden>
          <label htmlFor="withdrawal-website">Website</label>
          <input id="withdrawal-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
        </div>
      </div>

      <p className="mt-6 max-w-xl text-[14px] leading-relaxed text-ink-muted">
        Hiermit widerrufe ich den von mir abgeschlossenen Vertrag über den Kauf der oben genannten Waren.
      </p>

      {status === "failed" && fallbackEmail && (
        <MailFallback
          className="mt-5"
          email={fallbackEmail}
          subject={`Widerruf – Bestellung ${form.orderId.trim().toUpperCase()}`}
          body={[`Hiermit widerrufe ich den von mir abgeschlossenen Vertrag über den Kauf der folgenden Waren: ${form.items.trim() || "alle widerrufbaren Waren der Bestellung"}`, "", `Bestellnummer: ${form.orderId.trim().toUpperCase()}`, `Name: ${form.name.trim()}`].join("\n")}
        />
      )}
      {status === "failed" && !fallbackEmail && (
        <p role="alert" className="mt-5 rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-danger">
          Der Widerruf konnte gerade nicht übermittelt werden. Bitte versuch es noch einmal oder schick ihn per E-Mail an office@blumora.at.
        </p>
      )}

      <div className="mt-7">
        <Button type="submit" size="lg" loading={status === "sending"}>Widerruf bestätigen</Button>
      </div>
    </form>
  );
}
