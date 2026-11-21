"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, MailCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/client";
import { rich } from "@/components/checkout/rich-text";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Magic-link request. Never reveals whether an address is known. */
export function LoginCard({ notice, unavailable = false }: { notice?: string; /** Login cannot work yet (no mail delivery / datastore) – show the notice instead of the form. */ unavailable?: boolean }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [failMessage, setFailMessage] = useState<string | undefined>();
  const { m, locale } = useI18n();
  const t = m.account.login;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError(t.emailInvalid);
      return;
    }
    setError(undefined);
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, website, locale }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        setFailMessage(data?.message ?? t.sendFailed);
        setStatus("failed");
        return;
      }
      setStatus("sent");
    } catch {
      setFailMessage(t.sendFailed);
      setStatus("failed");
    }
  };

  if (status === "sent") {
    return (
      <div className="rounded-lg border border-line bg-white/60 p-6 sm:p-8" role="status" aria-live="polite">
        <span className="flex size-11 items-center justify-center rounded-full bg-ivory-200 text-forest"><MailCheck className="size-5" strokeWidth={1.5} aria-hidden /></span>
        <h2 className="mt-5 font-serif text-[26px] leading-tight text-ink">{t.sentTitle}</h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">
          {rich(t.sentText, { email: <strong className="font-semibold text-ink">{email.trim()}</strong> })}
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{t.sentHint}</p>
        <Button variant="link" className="mt-5" onClick={() => setStatus("idle")} iconRight={<ArrowRight className="size-4" aria-hidden />}>{t.otherAddress}</Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-white/60 p-6 sm:p-8">
      <span className="flex size-11 items-center justify-center rounded-full bg-ivory-200 text-forest"><Sparkles className="size-5" strokeWidth={1.5} aria-hidden /></span>
      <h2 className="mt-5 font-serif text-[26px] leading-tight text-ink">{t.title}</h2>
      {!unavailable && (
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">
          {t.intro}
        </p>
      )}
      {notice && <p role="status" className="mt-4 rounded-md bg-ivory-100 px-4 py-3 text-[13.5px] text-ink-muted">{notice}</p>}
      {!unavailable && (
      <form onSubmit={submit} noValidate className="mt-6" aria-label={t.formLabel}>
        <Input
          label={t.email} name="email" type="email" autoComplete="email" inputMode="email" required
          value={email} onChange={(e) => { setEmail(e.target.value); if (error) setError(undefined); }} error={error}
          placeholder={t.emailPlaceholder}
        />
        <div className="hidden" aria-hidden>
          <label htmlFor="login-website">Website</label>
          <input id="login-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        {status === "failed" && failMessage && (
          <p role="alert" className="mt-4 rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-danger">{failMessage}</p>
        )}
        <Button type="submit" size="lg" full className="mt-5" loading={status === "sending"} iconRight={<ArrowRight className="size-4" aria-hidden />}>
          {t.submit}
        </Button>
      </form>
      )}
      {!unavailable && (
        <p className="mt-4 text-[12.5px] leading-relaxed text-ink-soft">
          {t.firstLogin}
        </p>
      )}
    </div>
  );
}
