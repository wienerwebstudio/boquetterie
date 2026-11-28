"use client";
import { useEffect, useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { LANGUAGE_HINTS, LOCALE_INFO, localeFromBrowser, type Locale } from "@/i18n/config";
import { switchLocalePath } from "@/i18n/paths";
import { LANGUAGE_CHOICE_KEY } from "@/components/layout/language-switcher";
import { events, track } from "@/components/analytics/track";

const DISMISS_KEY = "bl_lang_hint_dismissed";
/** The hint already reported as `language_suggested` in this page load. */
let suggestedLocale: Locale | null = null;

/**
 * Small bar for visitors whose browser prefers another live language – written in that
 * language. Never redirects; disappears for good once a language was chosen or the
 * bar was closed.
 */
export function LanguageHint() {
  const { locale, live, m } = useI18n();
  const pathname = usePathname() ?? "/";
  const [target, setTarget] = useState<Locale | null>(null);

  useEffect(() => {
    if (live.length < 2) return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY) || window.localStorage.getItem(LANGUAGE_CHOICE_KEY)) return;
    } catch { /* private mode: show it */ }
    for (const code of navigator.languages ?? [navigator.language]) {
      const l = localeFromBrowser(code);
      if (l && live.includes(l)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only information
        if (l !== locale) setTarget(l);
        return;
      }
    }
  }, [live, locale]);

  // Once per page load and suggested language (the bar only appears until a language was chosen or it was closed).
  useEffect(() => {
    if (!target || suggestedLocale === target) return;
    suggestedLocale = target;
    track(events.languageSuggested, { suggested_locale: target });
  }, [target]);

  if (!target) return null;
  const hint = LANGUAGE_HINTS[target];
  const close = () => {
    try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    setTarget(null);
  };
  return (
    <div lang={LOCALE_INFO[target].htmlLang} dir={LOCALE_INFO[target].dir} className="bg-forest text-ivory">
      <div className="container-x flex items-center justify-center gap-3 py-2 text-[13px]">
        <span>{hint.text}</span>
        <NextLink
          href={switchLocalePath(pathname, target)}
          onClick={() => {
            try { window.localStorage.setItem(LANGUAGE_CHOICE_KEY, target); } catch { /* ignore */ }
            track(events.languageChanged, { from_locale: locale, to_locale: target });
          }}
          className="font-semibold underline underline-offset-4"
        >
          {hint.action}
        </NextLink>
        <button type="button" onClick={close} aria-label={m.common.close} className="ms-1 inline-flex size-7 items-center justify-center rounded-full hover:bg-white/10">
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
