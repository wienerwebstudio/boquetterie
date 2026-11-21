/** The i18n object used by Server and Client Components. Pure and client-safe. */
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { fmt, formatDateLongIn, formatDateShortIn, formatPriceIn, plural } from "@/i18n/format";
import { localizePath } from "@/i18n/paths";

export interface I18n {
  locale: Locale;
  m: Messages;
  fmt: typeof fmt;
  /** German path (as in `routes`) → URL in this language. */
  href: (path: string) => string;
  price: (value: number) => string;
  priceFrom: (value: number) => string;
  dateShort: (iso: string) => string;
  dateLong: (iso: string) => string;
  plural: (count: number, forms: Parameters<typeof plural>[2]) => string;
}

export function makeI18n(locale: Locale, m: Messages): I18n {
  return {
    locale,
    m,
    fmt,
    href: (path) => localizePath(locale, path),
    price: (v) => formatPriceIn(locale, v),
    priceFrom: (v) => fmt(m.common.priceFrom, { price: formatPriceIn(locale, v) }),
    dateShort: (iso) => formatDateShortIn(locale, iso),
    dateLong: (iso) => formatDateLongIn(locale, iso),
    plural: (count, forms) => plural(locale, count, forms),
  };
}

