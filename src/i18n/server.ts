import "server-only";
import { locale as rootLocale } from "next/root-params";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { loadMessages } from "@/i18n/messages";
import { makeI18n, type I18n } from "@/i18n/shared";

export type { I18n };

/** Language of the current request (Server Components only – not in route handlers or actions). */
export async function currentLocale(): Promise<Locale> {
  try {
    const l = await rootLocale();
    return isLocale(l) ? l : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Texts and helpers for the current request's language. */
export async function getI18n(locale?: Locale): Promise<I18n> {
  const l = locale ?? (await currentLocale());
  return makeI18n(l, await loadMessages(l));
}
