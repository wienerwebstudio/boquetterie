"use client";
import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Check, Globe } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { LOCALE_INFO, type Locale } from "@/i18n/config";
import { switchLocalePath } from "@/i18n/paths";
import { cn } from "@/lib/format";
import dynamic from "next/dynamic";

/** Flags (~14 KB) are only loaded when the menu is opened. */
const LanguageFlag = dynamic(() => import("@/components/layout/language-flag").then((m) => m.LanguageFlag), {
  ssr: false,
  loading: () => <span aria-hidden className="inline-block h-[14px] w-[21px] shrink-0" />,
});

export const LANGUAGE_CHOICE_KEY = "bl_lang_choice";

function rememberChoice(l: Locale) {
  try { window.localStorage.setItem(LANGUAGE_CHOICE_KEY, l); } catch { /* private mode */ }
}

/** Language menu in the header – each language in its own script. Hidden while only German is live. */
export function LanguageSwitcher() {
  const { locale, live, m } = useI18n();
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (live.length < 2) return null;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${m.common.languageLabel}: ${LOCALE_INFO[locale].name}`}
        className="inline-flex h-10 items-center gap-1 rounded-full px-2 text-[12px] font-semibold text-ink transition-colors hover:bg-ivory-200 hover:text-forest"
      >
        <Globe className="size-[18px]" strokeWidth={1.6} aria-hidden />
        <span>{LOCALE_INFO[locale].short}</span>
      </button>
      {open && (
        <ul className="absolute end-0 top-full z-50 mt-2 grid max-h-[75vh] w-64 overflow-y-auto rounded-md border border-line bg-white py-1.5 shadow-[0_18px_40px_-20px_rgba(35,35,31,0.35)] sm:w-[30rem] sm:grid-cols-2 sm:px-1.5">
          {live.map((l) => (
            <li key={l}>
              <NextLink
                href={switchLocalePath(pathname, l)}
                hrefLang={LOCALE_INFO[l].htmlLang}
                lang={LOCALE_INFO[l].htmlLang}
                aria-current={l === locale ? "true" : undefined}
                onClick={() => { rememberChoice(l); setOpen(false); }}
                className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-[14px] transition-colors hover:bg-ivory-100", l === locale ? "font-semibold text-forest" : "text-ink")}
              >
                <LanguageFlag locale={l} />
                <span dir={LOCALE_INFO[l].dir} className="min-w-0 leading-snug">{LOCALE_INFO[l].name}</span>
                {l === locale && <Check className="ms-auto size-4 shrink-0" aria-hidden />}
              </NextLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
