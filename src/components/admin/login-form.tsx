"use client";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Banner, Field, inputCls } from "@/components/admin/controls";

/** After this long without a page change the login is reported as not answering. */
const STALL_MS = 12_000;

/**
 * Admin login form. A plain form post (works without JavaScript); the script
 * only adds a busy state, a show-password toggle and a notice when the server
 * does not answer, so nobody is left staring at an unchanged page.
 */
export function AdminLoginForm({ next, disabled }: { next: string; disabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Back/forward cache restores the page as it was left – reset the busy state.
    const reset = () => {
      setPending(false);
      if (timer.current) clearTimeout(timer.current);
    };
    window.addEventListener("pageshow", reset);
    return () => {
      window.removeEventListener("pageshow", reset);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <>
      {stalled && (
        <Banner tone="error" className="mb-4">
          Die Anmeldung hat nicht geantwortet. Bitte die Seite neu laden und noch einmal versuchen. Bleibt es dabei, ist der Server gerade nicht erreichbar.
        </Banner>
      )}
      <form
        method="post"
        action="/api/admin/login"
        className="space-y-4 rounded-lg border border-line bg-white p-6"
        onSubmit={() => {
          setPending(true);
          setStalled(false);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            setPending(false);
            setStalled(true);
          }, STALL_MS);
        }}
      >
        <input type="hidden" name="next" value={next} />
        <Field label="Passwort" htmlFor="password" required>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              required
              autoFocus
              disabled={disabled}
              className={`${inputCls} pr-11`}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              disabled={disabled}
              aria-label={visible ? "Passwort verbergen" : "Passwort anzeigen"}
              aria-pressed={visible}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-muted hover:text-ink disabled:opacity-50"
            >
              {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </div>
        </Field>
        <Button type="submit" full disabled={disabled} loading={pending}>
          {pending ? "Wird geprüft …" : "Anmelden"}
        </Button>
      </form>
    </>
  );
}
