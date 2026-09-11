"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, MailCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Magic-link request. Never reveals whether an address is known. */
export function LoginCard({ notice }: { notice?: string }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [failMessage, setFailMessage] = useState<string | undefined>();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }
    setError(undefined);
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, website }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        setFailMessage(data?.message ?? "Der Link konnte gerade nicht gesendet werden. Bitte versuch es noch einmal.");
        setStatus("failed");
        return;
      }
      setStatus("sent");
    } catch {
      setFailMessage("Der Link konnte gerade nicht gesendet werden. Bitte versuch es noch einmal.");
      setStatus("failed");
    }
  };

  if (status === "sent") {
    return (
      <div className="rounded-lg border border-line bg-white/60 p-6 sm:p-8" role="status" aria-live="polite">
        <span className="flex size-11 items-center justify-center rounded-full bg-ivory-200 text-forest"><MailCheck className="size-5" strokeWidth={1.5} aria-hidden /></span>
        <h2 className="mt-5 font-serif text-[26px] leading-tight text-ink">Sieh in dein Postfach.</h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">
          Wenn die Adresse gültig ist, ist dein Login-Link an <strong className="font-semibold text-ink">{email.trim()}</strong> unterwegs. Er ist 15 Minuten gültig und funktioniert nur einmal.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">Nichts angekommen? Wirf einen Blick in den Spam-Ordner oder fordere den Link in ein paar Minuten neu an.</p>
        <Button variant="link" className="mt-5" onClick={() => setStatus("idle")} iconRight={<ArrowRight className="size-4" aria-hidden />}>Andere Adresse verwenden</Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-white/60 p-6 sm:p-8">
      <span className="flex size-11 items-center justify-center rounded-full bg-ivory-200 text-forest"><Sparkles className="size-5" strokeWidth={1.5} aria-hidden /></span>
      <h2 className="mt-5 font-serif text-[26px] leading-tight text-ink">Anmelden ohne Passwort</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">
        Gib deine E-Mail-Adresse ein – wir schicken dir einen Link, mit dem du direkt angemeldet bist. Kein Passwort, nichts zu merken.
      </p>
      {notice && <p role="status" className="mt-4 rounded-md bg-ivory-100 px-4 py-3 text-[13.5px] text-ink-muted">{notice}</p>}
      <form onSubmit={submit} noValidate className="mt-6" aria-label="Login-Link anfordern">
        <Input
          label="E-Mail-Adresse" name="email" type="email" autoComplete="email" inputMode="email" required
          value={email} onChange={(e) => { setEmail(e.target.value); if (error) setError(undefined); }} error={error}
          placeholder="du@beispiel.at"
        />
        <div className="hidden" aria-hidden>
          <label htmlFor="login-website">Website</label>
          <input id="login-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        {status === "failed" && failMessage && (
          <p role="alert" className="mt-4 rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-danger">{failMessage}</p>
        )}
        <Button type="submit" size="lg" full className="mt-5" loading={status === "sending"} iconRight={<ArrowRight className="size-4" aria-hidden />}>
          Login-Link senden
        </Button>
      </form>
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-soft">
        Beim ersten Login legen wir dein Konto automatisch an. Bestellen kannst du weiterhin auch ohne Konto.
      </p>
    </div>
  );
}
