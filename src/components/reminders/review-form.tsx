"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/format";

interface FormState { name: string; rating: number; text: string; website: string }
type Errors = Partial<Record<keyof FormState, string>>;

const RATING_LABELS = ["", "Enttäuschend", "Geht so", "Gut", "Sehr gut", "Wunderbar"];

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = "Bitte gib deinen Namen an (z. B. „Anna M.“).";
  if (f.rating < 1 || f.rating > 5) e.rating = "Bitte wähle 1 bis 5 Sterne.";
  if (f.text.trim().length < 10) e.text = "Bitte schreib ein paar Worte (mindestens 10 Zeichen).";
  if (f.text.length > 1000) e.text = "Die Bewertung darf höchstens 1000 Zeichen lang sein.";
  return e;
}

export function ReviewForm({ orderId, token, defaultName, className }: { orderId: string; token: string; defaultName?: string; className?: string }) {
  const [form, setForm] = useState<FormState>({ name: defaultName ?? "", rating: 0, text: "", website: "" });
  const [hover, setHover] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [failMessage, setFailMessage] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    setStatus("sending");
    setFailMessage(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderId, token, name: form.name.trim(), rating: form.rating, text: form.text.trim(), website: form.website }),
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
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-success text-ivory"><Check className="size-5" strokeWidth={2.5} aria-hidden /></span>
          <h2 className="display-3 mt-5 text-ink">Danke für deine Bewertung.</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
            Wir lesen jede Bewertung persönlich. Sobald wir sie freigegeben haben, erscheint sie im Shop.
          </p>
          <Button href="/blumen" variant="link" className="mt-6" iconRight={<ArrowRight className="size-4" aria-hidden />}>Zu den Sträußen</Button>
        </div>
      </div>
    );
  }

  const shown = hover || form.rating;

  return (
    <form onSubmit={submit} noValidate className={className} aria-label="Bewertung schreiben">
      <div className="grid gap-5">
        <div className="flex flex-col gap-1.5">
          <span id="rating-label" className="text-[13px] font-semibold text-ink">Deine Bewertung</span>
          <div role="radiogroup" aria-labelledby="rating-label" className="flex items-center gap-3">
            <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={form.rating === n}
                  aria-label={`${n} von 5 Sternen – ${RATING_LABELS[n]}`}
                  onClick={() => set("rating", n)}
                  onMouseEnter={() => setHover(n)}
                  onFocus={() => setHover(n)}
                  onBlur={() => setHover(0)}
                  className="rounded-sm p-0.5 text-forest transition-transform hover:scale-110"
                >
                  <svg viewBox="0 0 20 20" className="size-8" aria-hidden fill={n <= shown ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.2">
                    <path d="M10 2.5l2.3 4.9 5.3.7-3.9 3.7.9 5.3L10 14.6l-4.7 2.5.9-5.3L2.4 8.1l5.3-.7z" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
            <span className={cn("text-[14px]", shown ? "text-ink" : "text-ink-soft")}>{shown ? RATING_LABELS[shown] : "Sterne wählen"}</span>
          </div>
          {errors.rating && <p role="alert" className="text-[13px] text-danger">{errors.rating}</p>}
        </div>

        <Input label="Dein Name" name="name" autoComplete="name" maxLength={60} value={form.name} onChange={(e) => set("name", e.target.value)} error={errors.name} hint="So erscheint er im Shop – z. B. „Anna M.“" required />
        <Textarea label="Wie war der Strauß?" name="text" rows={6} maxLength={1000} value={form.text} onChange={(e) => set("text", e.target.value)} error={errors.text} hint={`${form.text.length}/1000 Zeichen`} placeholder="Frische, Lieferung, Karte – was ist dir aufgefallen?" required />

        <div className="hidden" aria-hidden>
          <label htmlFor="review-website">Website</label>
          <input id="review-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
        </div>
      </div>

      {status === "failed" && (
        <p role="alert" className="mt-5 rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-danger">
          {failMessage ?? "Die Bewertung konnte nicht gespeichert werden. Bitte versuch es noch einmal."}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-[12px] leading-relaxed text-ink-soft">
          Deine Bewertung wird vor der Veröffentlichung von uns gelesen. Bestellnummer {orderId}.
        </p>
        <Button type="submit" size="lg" loading={status === "sending"} iconRight={<ArrowRight className="size-4" aria-hidden />}>
          Bewertung absenden
        </Button>
      </div>
    </form>
  );
}
