"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Mail } from "lucide-react";

/** E-mail → magic link. The answer is always the same neutral sentence (no enumeration). */
export function PartnerLoginForm() {
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true);
    try {
      const res = await fetch("/api/partner/request-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), website: data.get("website") }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      setState({ ok: Boolean(body?.ok), message: body?.message ?? "Das hat nicht geklappt. Bitte versuch es noch einmal." });
    } catch {
      setState({ ok: false, message: "Keine Verbindung. Bitte versuch es noch einmal." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label="Login Partner-Portal">
      <div className="flex flex-col gap-2">
        <label htmlFor="partner-email" className="text-[13px] font-semibold text-ink">E-Mail-Adresse</label>
        <input
          id="partner-email" name="email" type="email" required autoComplete="email" inputMode="email" maxLength={254}
          className="h-12 w-full rounded-md border border-line-strong bg-white px-4 text-[16px] text-ink placeholder:text-ink-soft focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          placeholder="name@floristik.at"
        />
      </div>
      <div className="hidden" aria-hidden>
        <label htmlFor="partner-website">Website</label>
        <input id="partner-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <button type="submit" disabled={pending} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-forest px-6 text-[15px] font-semibold text-ivory transition-colors hover:bg-forest-700 disabled:opacity-60">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Mail className="size-4" aria-hidden />}
        Login-Link senden
      </button>
      <div aria-live="polite">
        {state && <p className={`rounded-md border px-4 py-3 text-[14px] leading-relaxed ${state.ok ? "border-sage-700/30 bg-sage text-forest" : "border-danger/30 bg-rose-100 text-burgundy"}`}>{state.message}</p>}
      </div>
    </form>
  );
}
