"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "@/components/ui/link";
import { X } from "lucide-react";
import type { ConsentCategory, ConsentChoice, ConsentState } from "@/types/consent";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/format";
import { routes } from "@/lib/urls";
import { useI18n } from "@/i18n/client";
import { useConsent } from "./store";

/** Labels and texts live in the dictionary (`layout.consent.categories`). */
const CATEGORIES: { key: ConsentCategory; locked?: boolean }[] = [
  { key: "necessary", locked: true },
  { key: "analytics" },
  { key: "marketing" },
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
  const t = useI18n().m.layout.consent;

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
          <p className="eyebrow mb-2">{t.eyebrow}</p>
          <h2 id={titleId} className="font-serif text-[26px] leading-tight text-ink">{t.title}</h2>
        </div>
        {canDismiss && (
          <button
            type="button"
            onClick={close}
            aria-label={t.close}
            className="-mr-2 -mt-1 rounded-full p-2 text-ink-muted transition-colors hover:bg-ivory-200 hover:text-ink"
          >
            <X className="size-5" aria-hidden />
          </button>
        )}
      </div>

      {view === "choice" ? (
        <>
          <p id={descId} className="mt-3 text-[14px] leading-relaxed text-ink-muted">
            {t.intro}{" "}
            <Link href={routes.legal.privacy} className="text-forest underline underline-offset-4">{t.privacyPolicy}</Link>.
          </p>
          {/* Three equal-weight choices – no highlighted "accept" and no hidden "reject". */}
          <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
            <Button variant="outline" onClick={acceptAll}>{t.acceptAll}</Button>
            <Button variant="outline" onClick={acceptNecessary}>{t.necessaryOnly}</Button>
            <Button variant="outline" onClick={() => setView("settings")}>{t.settings}</Button>
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
  const t = useI18n().m.layout.consent;

  return (
    <>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
        {t.settingsIntro}{" "}
        <Link href={routes.legal.privacy} className="text-forest underline underline-offset-4">{t.privacyPolicy}</Link>.
      </p>
      <ul className="mt-5 divide-y divide-line border-y border-line">
        {CATEGORIES.map((c) => {
          const checked = c.locked ? true : draft[c.key as keyof ConsentChoice];
          const { label, text } = t.categories[c.key];
          return (
            <li key={c.key} className="flex items-start justify-between gap-5 py-4">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">
                  {label}
                  {c.locked && <span className="ml-2 text-[12px] font-normal text-ink-soft">{t.alwaysActive}</span>}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{text}</p>
              </div>
              <Switch
                checked={checked}
                disabled={c.locked}
                label={label}
                onChange={(v) => setDraft((d) => ({ ...d, [c.key]: v }))}
              />
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onBack} className="text-[13px] font-semibold text-forest underline-offset-4 hover:underline">
          {t.back}
        </button>
        <Button variant="outline" onClick={() => onSave(draft)}>{t.save}</Button>
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
