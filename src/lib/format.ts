const eur = new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" });

export function formatPrice(value: number) {
  return eur.format(value);
}

export function formatPriceFrom(value: number) {
  return `ab ${eur.format(value)}`;
}

/** "2026-09-12" -> "Fr., 12. Sept." */
export function formatDateShort(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("de-AT", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(date);
}

/** "2026-09-12" -> "Freitag, 12. September 2026" */
export function formatDateLong(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("de-AT", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Vienna" }).format(new Date(iso));
}

export function pluralize(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
