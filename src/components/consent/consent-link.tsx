"use client";
import { useI18n } from "@/i18n/client";
import { useConsent } from "./store";

/** Re-opens the consent sheet (settings view). Rendered like a footer link. */
export function ConsentSettingsLink({ className, children }: { className?: string; children?: React.ReactNode }) {
  const open = useConsent((s) => s.open);
  const { m } = useI18n();
  return (
    <button type="button" onClick={open} className={className}>
      {children === undefined ? m.layout.footer.links.cookieSettings : children}
    </button>
  );
}
