"use client";
import { useConsent } from "./store";

/** Re-opens the consent sheet (settings view). Rendered like a footer link. */
export function ConsentSettingsLink({ className, children = "Cookie-Einstellungen" }: { className?: string; children?: React.ReactNode }) {
  const open = useConsent((s) => s.open);
  return (
    <button type="button" onClick={open} className={className}>
      {children}
    </button>
  );
}
