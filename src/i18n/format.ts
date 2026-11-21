/** Locale-aware formatting and `{placeholder}` filling. Pure and client-safe. */
import { LOCALE_INFO, type Locale } from "@/i18n/config";

/** Fills `{name}` placeholders: `fmt("ab {price}", { price: "39 €" })`. */
export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

const priceFormats = new Map<Locale, Intl.NumberFormat>();
export function formatPriceIn(locale: Locale, value: number) {
  let f = priceFormats.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE_INFO[locale].intl, { style: "currency", currency: "EUR" });
    priceFormats.set(locale, f);
  }
  return f.format(value);
}

function isoDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/** "2026-09-12" → "Fr., 12. Sept." / "Fri 12 Sept" … */
export function formatDateShortIn(locale: Locale, iso: string) {
  return new Intl.DateTimeFormat(LOCALE_INFO[locale].intl, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(isoDate(iso));
}

/** "2026-09-12" → "Freitag, 12. September 2026" / "Friday 12 September 2026" … */
export function formatDateLongIn(locale: Locale, iso: string) {
  return new Intl.DateTimeFormat(LOCALE_INFO[locale].intl, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(isoDate(iso));
}

export function formatDateTimeIn(locale: Locale, iso: string) {
  return new Intl.DateTimeFormat(LOCALE_INFO[locale].intl, { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Vienna" }).format(new Date(iso));
}

/** Simple plural: `{count}` in the chosen form (Intl.PluralRules picks one/few/many/other). */
export function plural(locale: Locale, count: number, forms: { one: string; other: string; few?: string; many?: string; two?: string; zero?: string }) {
  const rule = new Intl.PluralRules(LOCALE_INFO[locale].intl).select(count) as keyof typeof forms;
  return fmt(forms[rule] ?? forms.other, { count });
}
