"use client";
import { useId, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = { status: "idle" | "loading" | "success" | "error"; message?: string };

export function NewsletterForm({ placeholder, button, note }: { placeholder: string; button: string; note: string }) {
  const [email, setEmail] = useState("");
  /** Honeypot – stays empty for humans; the field is hidden and excluded from the tab order. */
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const id = useId();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setState({ status: "error", message: "Bitte gib eine gültige E-Mail-Adresse ein." });
      return;
    }
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setState({ status: "error", message: data.message ?? "Das hat leider nicht geklappt. Bitte versuch es später noch einmal." });
        return;
      }
      setState({ status: "success" });
    } catch {
      setState({ status: "error", message: "Das hat leider nicht geklappt. Bitte versuch es später noch einmal." });
    }
  };

  if (state.status === "success") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-md bg-white p-5 shadow-soft animate-fade-up">
        <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-ivory"><Check className="size-3.5" strokeWidth={3} aria-hidden /></span>
        <div>
          <p className="text-[15px] font-semibold text-ink">Danke – du bist dabei.</p>
          <p className="mt-1 text-[13.5px] text-ink-muted">Wir melden uns, wenn es etwas Schönes zu erzählen gibt.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="relative flex flex-col gap-3" aria-describedby={`${id}-note`}>
      <label htmlFor={`${id}-email`} className="sr-only">E-Mail-Adresse</label>
      <div aria-hidden className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website (bitte leer lassen)</label>
        <input id={`${id}-website`} type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={`${id}-email`}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (state.status === "error") setState({ status: "idle" }); }}
          placeholder={placeholder}
          aria-invalid={state.status === "error" || undefined}
          aria-describedby={state.status === "error" ? `${id}-error` : undefined}
          className="h-12 min-w-0 flex-1 rounded-md border border-line bg-white px-4 text-[15px] text-ink placeholder:text-ink-soft transition-colors focus:border-forest focus:outline-none"
        />
        <Button type="submit" size="lg" loading={state.status === "loading"} className="shrink-0">{button}</Button>
      </div>
      <div aria-live="polite" className="min-h-[1rem]">
        {state.status === "error" && <p id={`${id}-error`} className="text-[13px] text-danger">{state.message}</p>}
      </div>
      <p id={`${id}-note`} className="text-[12.5px] leading-relaxed text-ink-soft">{note}</p>
    </form>
  );
}
