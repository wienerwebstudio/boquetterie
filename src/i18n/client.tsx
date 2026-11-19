"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { makeI18n, type I18n } from "@/i18n/shared";
import germanMessages from "@/i18n/messages/de";

type ClientI18n = I18n & { /** Languages switched on (for the language switcher). */ live: readonly Locale[] };
const Ctx = createContext<ClientI18n | null>(null);

/** Provides the language and its texts to Client Components (set in the locale layout). */
export function I18nProvider({ locale, messages, live = [locale], children }: { locale: Locale; messages: Messages; live?: readonly Locale[]; children: ReactNode }) {
  const value = useMemo(() => ({ ...makeI18n(locale, messages), live }), [locale, messages, live]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Texts and helpers in Client Components. Outside a provider (tests, admin) German is used. */
export function useI18n(): ClientI18n {
  const v = useContext(Ctx);
  if (v) return v;
  return fallback();
}

let germanFallback: ClientI18n | null = null;
function fallback(): ClientI18n {
  germanFallback ??= { ...makeI18n("de", germanMessages), live: ["de"] };
  return germanFallback;
}

/** `useRouter()` whose push/replace take German paths and keep the visitor's language. */
export function useLocalizedRouter() {
  const router = useRouter();
  const { href } = useI18n();
  return useMemo(
    () => ({
      ...router,
      push: (path: string, opts?: Parameters<typeof router.push>[1]) => router.push(href(path), opts),
      replace: (path: string, opts?: Parameters<typeof router.replace>[1]) => router.replace(href(path), opts),
    }),
    [router, href],
  );
}
