/** Locale-aware formatting and `{placeholder}` filling. Pure and client-safe. */
import { LOCALE_INFO, type Locale } from "@/i18n/config";

/** Fills `{name}` placeholders: `fmt("ab {price}", { price: "39 €" })`. */
export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/*
 * Albanian: Node has the CLDR data, Chrome does not (it falls back to English), so server and
 * browser would render different dates and prices (hydration error). Albanian dates and prices
 * are therefore formatted here by hand – the same everywhere. Tested in tests/unit/format-sq.test.ts.
 */
const SQ_MONTHS_SHORT = ["jan", "shk", "mar", "pri", "maj", "qer", "korr", "gush", "sht", "tet", "nën", "dhj"];
const SQ_MONTHS_LONG = ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"];
const SQ_DAYS_SHORT = ["die", "hën", "mar", "mër", "enj", "pre", "sht"];
const SQ_DAYS_LONG = ["e diel", "e hënë", "e martë", "e mërkurë", "e enjte", "e premte", "e shtunë"];

/** Calendar parts of a date in a time zone (formatToParts with a locale every runtime has). */
function zonedParts(date: Date, timeZone = "UTC") {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { y: Number(get("year")), m: Number(get("month")) - 1, d: Number(get("day")), weekday, time: `${get("hour")}:${get("minute")}` };
}

function formatSqDate(date: Date, o: Intl.DateTimeFormatOptions): string {
  const p = zonedParts(date, o.timeZone);
  if (o.dateStyle) return `${p.d} ${SQ_MONTHS_SHORT[p.m]} ${p.y}${o.timeStyle ? `, ${p.time}` : ""}`;
  const month = o.month === "long" ? SQ_MONTHS_LONG[p.m] : o.month ? SQ_MONTHS_SHORT[p.m] : "";
  const core = [o.day ? String(p.d) : "", month, o.year ? String(p.y) : ""].filter(Boolean).join(" ");
  const day = o.weekday === "long" ? SQ_DAYS_LONG[p.weekday] : o.weekday ? SQ_DAYS_SHORT[p.weekday] : "";
  return day ? (core ? `${day}, ${core}` : day) : core;
}

/** `Intl.DateTimeFormat` that renders the same on server and in every browser (see Albanian above). */
export function dateFormatIn(locale: Locale, options: Intl.DateTimeFormatOptions): { format(date: Date): string } {
  if (locale === "sq") return { format: (date) => formatSqDate(date, options) };
  return new Intl.DateTimeFormat(LOCALE_INFO[locale].intl, options);
}

/** Albanian price: "39,90 €", "12 345,00 €" (non-breaking spaces, grouping from five digits like CLDR). */
function formatSqPrice(value: number) {
  const [int, dec] = Math.abs(value).toFixed(2).split(".");
  const grouped = int.length > 4 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") : int;
  return `${value < 0 ? "-" : ""}${grouped},${dec}\u00a0€`;
}

const priceFormats = new Map<Locale, Intl.NumberFormat>();
export function formatPriceIn(locale: Locale, value: number) {
  if (locale === "sq") return formatSqPrice(value);
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
  return dateFormatIn(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(isoDate(iso));
}

/** "2026-09-12" → "Freitag, 12. September 2026" / "Friday 12 September 2026" … */
export function formatDateLongIn(locale: Locale, iso: string) {
  return dateFormatIn(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(isoDate(iso));
}

export function formatDateTimeIn(locale: Locale, iso: string) {
  return dateFormatIn(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Vienna" }).format(new Date(iso));
}

/** Simple plural: `{count}` in the chosen form (Intl.PluralRules picks one/few/many/other). */
export function plural(locale: Locale, count: number, forms: { one: string; other: string; few?: string; many?: string; two?: string; zero?: string }) {
  const rule = new Intl.PluralRules(LOCALE_INFO[locale].intl).select(count) as keyof typeof forms;
  return fmt(forms[rule] ?? forms.other, { count });
}
