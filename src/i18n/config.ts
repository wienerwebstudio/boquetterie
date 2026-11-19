/**
 * Languages of the storefront. German is the default and lives at the root
 * (`/blumen`); every other language under its own prefix (`/en/flowers`).
 * Internally every route is `/{locale}/{german segments}` – the proxy maps the
 * public paths to that and back (see `src/i18n/paths.ts`).
 *
 * Pure and client-safe.
 */

export const LOCALES = ["de", "en", "tr", "bks", "uk", "ru", "pl", "ro", "hu", "ar", "bg", "fa", "sk", "it", "fr", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "de";

export interface LocaleInfo {
  /** Name in the language itself – shown in the language switcher. */
  name: string;
  /** Short label for compact switchers. */
  short: string;
  /** `<html lang>` value. */
  htmlLang: string;
  /** hreflang codes Google gets for this version (BKS covers three languages). */
  hreflang: string[];
  /** Locale for Intl number and date formatting. */
  intl: string;
  /** Open Graph locale. */
  og: string;
  dir: "ltr" | "rtl";
}

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  de: { name: "Deutsch", short: "DE", htmlLang: "de-AT", hreflang: ["de"], intl: "de-AT", og: "de_AT", dir: "ltr" },
  en: { name: "English", short: "EN", htmlLang: "en", hreflang: ["en"], intl: "en-GB", og: "en_GB", dir: "ltr" },
  tr: { name: "Türkçe", short: "TR", htmlLang: "tr", hreflang: ["tr"], intl: "tr-TR", og: "tr_TR", dir: "ltr" },
  bks: { name: "Bosanski · Hrvatski · Srpski", short: "BKS", htmlLang: "hr", hreflang: ["bs", "hr", "sr"], intl: "bs-Latn-BA", og: "bs_BA", dir: "ltr" },
  uk: { name: "Українська", short: "UK", htmlLang: "uk", hreflang: ["uk"], intl: "uk-UA", og: "uk_UA", dir: "ltr" },
  ru: { name: "Русский", short: "RU", htmlLang: "ru", hreflang: ["ru"], intl: "ru-RU", og: "ru_RU", dir: "ltr" },
  pl: { name: "Polski", short: "PL", htmlLang: "pl", hreflang: ["pl"], intl: "pl-PL", og: "pl_PL", dir: "ltr" },
  ro: { name: "Română", short: "RO", htmlLang: "ro", hreflang: ["ro"], intl: "ro-RO", og: "ro_RO", dir: "ltr" },
  hu: { name: "Magyar", short: "HU", htmlLang: "hu", hreflang: ["hu"], intl: "hu-HU", og: "hu_HU", dir: "ltr" },
  ar: { name: "العربية", short: "AR", htmlLang: "ar", hreflang: ["ar"], intl: "ar-u-nu-latn", og: "ar_AR", dir: "rtl" },
  bg: { name: "Български", short: "BG", htmlLang: "bg", hreflang: ["bg"], intl: "bg-BG", og: "bg_BG", dir: "ltr" },
  fa: { name: "فارسی", short: "FA", htmlLang: "fa", hreflang: ["fa"], intl: "fa-u-nu-latn", og: "fa_IR", dir: "rtl" },
  sk: { name: "Slovenčina", short: "SK", htmlLang: "sk", hreflang: ["sk"], intl: "sk-SK", og: "sk_SK", dir: "ltr" },
  it: { name: "Italiano", short: "IT", htmlLang: "it", hreflang: ["it"], intl: "it-IT", og: "it_IT", dir: "ltr" },
  fr: { name: "Français", short: "FR", htmlLang: "fr", hreflang: ["fr"], intl: "fr-FR", og: "fr_FR", dir: "ltr" },
  es: { name: "Español", short: "ES", htmlLang: "es", hreflang: ["es"], intl: "es-ES", og: "es_ES", dir: "ltr" },
};

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/**
 * Languages that are finished and switched on: shown in the switcher, in the
 * sitemap and in hreflang. Any other locale answers 404 – a half-translated
 * language never goes public. Add a locale here once its texts are complete.
 */
export const LIVE_LOCALES: readonly Locale[] = ["de"];

/** `I18N_PREVIEW=1` (local, tests, previews) switches every language on. Server only. */
export function liveLocales(): readonly Locale[] {
  return typeof process !== "undefined" && process.env.I18N_PREVIEW === "1" ? LOCALES : LIVE_LOCALES;
}

export function isLiveLocale(v: unknown): v is Locale {
  return isLocale(v) && liveLocales().includes(v);
}

/** Hint shown to visitors whose browser prefers another live language – in that language. */
export const LANGUAGE_HINTS: Record<Locale, { text: string; action: string }> = {
  de: { text: "Diese Seite gibt es auch auf Deutsch.", action: "Auf Deutsch ansehen" },
  en: { text: "This site is also available in English.", action: "View in English" },
  tr: { text: "Bu site Türkçe olarak da mevcut.", action: "Türkçe görüntüle" },
  bks: { text: "Ova stranica je dostupna i na našem jeziku.", action: "Prikaži na našem jeziku" },
  uk: { text: "Цей сайт доступний також українською.", action: "Переглянути українською" },
  ru: { text: "Этот сайт также доступен на русском языке.", action: "Открыть на русском" },
  pl: { text: "Ta strona jest dostępna także po polsku.", action: "Zobacz po polsku" },
  ro: { text: "Acest site este disponibil și în limba română.", action: "Vezi în română" },
  hu: { text: "Ez az oldal magyarul is elérhető.", action: "Megtekintés magyarul" },
  ar: { text: "هذا الموقع متوفر أيضًا باللغة العربية.", action: "عرض بالعربية" },
  bg: { text: "Този сайт е достъпен и на български.", action: "Вижте на български" },
  fa: { text: "این سایت به زبان فارسی هم در دسترس است.", action: "مشاهده به فارسی" },
  sk: { text: "Táto stránka je dostupná aj po slovensky.", action: "Zobraziť po slovensky" },
  it: { text: "Questo sito è disponibile anche in italiano.", action: "Vedi in italiano" },
  fr: { text: "Ce site est également disponible en français.", action: "Voir en français" },
  es: { text: "Este sitio también está disponible en español.", action: "Ver en español" },
};

/** Browser language code (e.g. "hr-HR", "sr", "uk") → our locale. */
export function localeFromBrowser(code: string): Locale | null {
  const base = code.toLowerCase().split("-")[0];
  if (["bs", "hr", "sr", "sh", "cnr"].includes(base)) return "bks";
  if (base === "prs") return "fa"; // Dari
  return isLocale(base) ? base : null;
}
