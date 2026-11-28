/**
 * Loads the UI texts of a language. Missing keys fall back to German, so a
 * partly translated language never shows empty labels (live languages are
 * checked for completeness in tests/unit/i18n.test.ts).
 */
import de, { type Messages } from "@/i18n/messages/de";
import type { Locale } from "@/i18n/config";

export type { Messages };

/** Plural objects `{ one, other }` may carry the extra forms other languages need. */
type PluralForms = { zero?: string; one?: string; two?: string; few?: string; many?: string; other?: string };
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string ? string : T[K] extends { one: string; other: string } ? PluralForms : DeepPartial<T[K]>;
};
export type PartialMessages = DeepPartial<Messages>;

const loaders: Record<Exclude<Locale, "de">, () => Promise<{ default: PartialMessages }>> = {
  en: () => import("@/i18n/messages/en"),
  tr: () => import("@/i18n/messages/tr"),
  bks: () => import("@/i18n/messages/bks"),
  uk: () => import("@/i18n/messages/uk"),
  ru: () => import("@/i18n/messages/ru"),
  pl: () => import("@/i18n/messages/pl"),
  ro: () => import("@/i18n/messages/ro"),
  hu: () => import("@/i18n/messages/hu"),
  ar: () => import("@/i18n/messages/ar"),
  bg: () => import("@/i18n/messages/bg"),
  fa: () => import("@/i18n/messages/fa"),
  ce: () => import("@/i18n/messages/ce"),
  sk: () => import("@/i18n/messages/sk"),
  it: () => import("@/i18n/messages/it"),
  fr: () => import("@/i18n/messages/fr"),
  es: () => import("@/i18n/messages/es"),
  sq: () => import("@/i18n/messages/sq"),
  sv: () => import("@/i18n/messages/sv"),
  no: () => import("@/i18n/messages/no"),
  da: () => import("@/i18n/messages/da"),
  fi: () => import("@/i18n/messages/fi"),
  nl: () => import("@/i18n/messages/nl"),
  cs: () => import("@/i18n/messages/cs"),
  sl: () => import("@/i18n/messages/sl"),
};

function merge<T>(base: T, over: unknown): T {
  if (!over || typeof over !== "object") return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    const b = out[k];
    if (typeof v === "string") { if (v.trim()) out[k] = v; }
    else if (b && typeof b === "object" && v && typeof v === "object" && !Array.isArray(v)) out[k] = merge(b, v);
  }
  return out as T;
}

const cache = new Map<Locale, Promise<Messages>>();

export function loadMessages(locale: Locale): Promise<Messages> {
  if (locale === "de") return Promise.resolve(de);
  let p = cache.get(locale);
  if (!p) {
    p = loaders[locale]().then((m) => merge(de, m.default));
    cache.set(locale, p);
  }
  return p;
}

export { de as germanMessages, merge as mergeMessages };
