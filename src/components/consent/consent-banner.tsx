"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { ConsentCategory, ConsentChoice, ConsentState } from "@/types/consent";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/format";
import { routes } from "@/lib/urls";
import { useConsent } from "./store";

const CATEGORIES: { key: ConsentCategory; label: string; text: string; locked?: boolean }[] = [
  {
    key: "necessary",
    label: "Notwendig",
    locked: true,
    text: "Warenkorb, Lieferprüfung, Sicherheit und deine Cookie-Auswahl selbst. Ohne diese Cookies funktioniert der Shop nicht.",
  },
  {
    key: "analytics",
    label: "Statistik",
    text: "Reichweitenmessung, damit wir verstehen, welche Seiten und Sträuße gut ankommen. Wird nur geladen, wenn du zustimmst.",
  },
  {
    key: "marketing",
    label: "Marketing",
    text: "Ermöglicht es, dir passende Angebote auf anderen Plattformen zu zeigen und deren Erfolg zu messen. Wird nur mit deiner Zustimmung aktiviert.",
  },
];

/**
 * Discreet, non-modal consent sheet. On the first visit it stays until a choice is
 * made, but it never blocks the page (no overlay, scrolling stays possible, Esc does
 * not dismiss). Re-opened via `useConsent().open()` – e.g. the footer link – it can
 * be closed again because a choice already exists.
 */
export function ConsentBanner() {
  const consent = useConsent((s) => s.consent);
  const hydrated = useConsent((s) => s.hydrated);
  const isOpen = useConsent((s) => s.isOpen);
  const view = useConsent((s) => s.view);
  const hydrate = useConsent((s) => s.hydrate);
  const setView = useConsent((s) => s.setView);
  const acceptAll = useConsent((s) => s.acceptAll);
  const acceptNecessary = useConsent((s) => s.acceptNecessary);
  const save = useConsent((s) => s.save);
  const close = useConsent((s) => s.close);

  const dialogRef = useRef<HTMLDivElement>(null);
  const lastActive = useRef<Element | null>(null);
  const titleId = useId();
  const descId = useId();
  const canDismiss = consent !== null;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Remember where focus was and give it back when the sheet goes away.
  useEffect(() => {
    if (!isOpen) return;
    lastActive.current = document.activeElement;
    return () => {
      const el = lastActive.current as HTMLElement | null;
      if (el && typeof el.focus === "function" && document.contains(el)) el.focus();
    };
  }, [isOpen]);

  // Move focus into the sheet when it opens or switches view (announces the dialog, no trap).
  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => dialogRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [isOpen, view]);

  // Esc closes only when a choice already exists – on the first visit the sheet stays,
  // but the page underneath remains fully usable.
  useEffect(() => {
    if (!isOpen || !canDismiss) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, canDismiss, close]);

  if (!hydrated || !isOpen) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={view === "choice" ? descId : undefined}
      tabIndex={-1}
      className="fixed inset-x-4 bottom-4 z-[90] max-w-[540px] rounded-lg border border-line bg-white p-5 shadow-lift outline-none animate-toast sm:bottom-6 sm:left-6 sm:right-auto sm:w-full sm:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Datenschutz</p>
          <h2 id={titleId} className="font-serif text-[26px] leading-tight text-ink">Cookies &amp; Datenschutz</h2>
        </div>
        {canDismiss && (
          <button
            type="button"
            onClick={close}
            aria-label="Schließen"
            className="-mr-2 -mt-1 rounded-full p-2 text-ink-muted transition-colors hover:bg-ivory-200 hover:text-ink"
          >
            <X className="size-5" aria-hidden />
          </button>
        )}
      </div>

      {view === "choice" ? (
        <>
          <p id={descId} className="mt-3 text-[14px] leading-relaxed text-ink-muted">
            Wir verwenden notwendige Cookies, damit der Shop funktioniert. Statistik- und Marketing-Cookies setzen wir nur, wenn du zustimmst.
            Deine Auswahl kannst du jederzeit über „Cookie-Einstellungen“ im Footer ändern. Mehr dazu in der{" "}
            <Link href={routes.legal.privacy} className="text-forest underline underline-offset-4">Datenschutzerklärung</Link>.
          </p>
          {/* Three equal-weight choices – no highlighted "accept" and no hidden "reject". */}
          <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
            <Button variant="outline" onClick={acceptAll}>Alle akzeptieren</Button>
            <Button variant="outline" onClick={acceptNecessary}>Nur notwendige</Button>
            <Button variant="outline" onClick={() => setView("settings")}>Einstellungen</Button>
          </div>
        </>
      ) : (
        <SettingsView consent={consent} onBack={() => setView("choice")} onSave={save} />
      )}
    </div>
  );
}

/* ---------------- Settings ---------------- */

function SettingsView({ consent, onBack, onSave }: { consent: ConsentState | null; onBack: () => void; onSave: (choice: ConsentChoice) => void }) {
  // Mounted fresh whenever the settings view opens, so the initial draft mirrors the stored choice.
  const [draft, setDraft] = useState<ConsentChoice>({ analytics: consent?.analytics ?? false, marketing: consent?.marketing ?? false });

  return (
    <>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
        Wähle, welche Cookies wir setzen dürfen. Notwendige Cookies sind immer aktiv. Details in der{" "}
        <Link href={routes.legal.privacy} className="text-forest underline underline-offset-4">Datenschutzerklärung</Link>.
      </p>
      <ul className="mt-5 divide-y divide-line border-y border-line">
        {CATEGORIES.map((c) => {
          const checked = c.locked ? true : draft[c.key as keyof ConsentChoice];
          return (
            <li key={c.key} className="flex items-start justify-between gap-5 py-4">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">
                  {c.label}
                  {c.locked && <span className="ml-2 text-[12px] font-normal text-ink-soft">Immer aktiv</span>}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{c.text}</p>
              </div>
              <Switch
                checked={checked}
                disabled={c.locked}
                label={c.label}
                onChange={(v) => setDraft((d) => ({ ...d, [c.key]: v }))}
              />
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onBack} className="text-[13px] font-semibold text-forest underline-offset-4 hover:underline">
          Zurück
        </button>
        <Button variant="outline" onClick={() => onSave(draft)}>Auswahl speichern</Button>
      </div>
    </>
  );
}

function Switch({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-300 ease-[var(--ease-soft)]",
        checked ? "border-forest bg-forest" : "border-stone bg-ivory-200",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        aria-hidden
        className={cn("inline-block size-4.5 rounded-full bg-white shadow-soft transition-transform duration-300 ease-[var(--ease-soft)]", checked ? "translate-x-[22px]" : "translate-x-[3px]")}
      />
    </button>
  );
}
