import "server-only";
import type { Metadata } from "next";
import { getSettings } from "@/lib/cms";
import { DEFAULT_LOCALE, LOCALE_INFO, liveLocales, type Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/paths";
import { currentLocale } from "@/i18n/server";

const DEFAULT_OG_IMAGE = { url: "/images/hero/hero-wien-tram-og.jpg", width: 1200, height: 630 };

export interface PageMetaInput {
  /** Page title without the brand – the root layout's template appends it. */
  title: string;
  description?: string;
  /** Canonical German path, e.g. "/blumen/rosen" – localized automatically. */
  path: string;
  image?: { url: string; alt?: string };
  /** Keep the page out of the index (still followed). */
  noindex?: boolean;
  /** Use the title as is, without the brand suffix (home page). */
  absoluteTitle?: boolean;
  /** Languages this page exists in (default: all live languages). */
  locales?: readonly Locale[];
}

/**
 * hreflang map for a German path: every live language (BKS under bs, hr and sr)
 * plus `x-default` → German.
 */
export function languageAlternates(path: string, locales: readonly Locale[] = liveLocales()): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of locales) for (const code of LOCALE_INFO[l].hreflang) out[code] = localizePath(l, path);
  if (locales.includes(DEFAULT_LOCALE)) out["x-default"] = path;
  return out;
}

/**
 * One place for per-page metadata so title, description, canonical and Open
 * Graph always agree. A page-level `openGraph` replaces the layout's object
 * completely in Next, so site name, locale and URL are repeated here.
 */
export async function pageMetadata(input: PageMetaInput): Promise<Metadata> {
  const [settings, locale] = await Promise.all([getSettings(), currentLocale()]);
  const url = localizePath(locale, input.path);
  const locales = input.locales ?? liveLocales();
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: {
      canonical: url,
      ...(locales.length > 1 && !input.noindex ? { languages: languageAlternates(input.path, locales) } : {}),
    },
    openGraph: {
      type: "website",
      locale: LOCALE_INFO[locale].og,
      siteName: settings.brand.name,
      title: input.title,
      description: input.description,
      url,
      images: [input.image ?? DEFAULT_OG_IMAGE],
    },
    ...(input.noindex && { robots: { index: false, follow: true } }),
  };
}

/** True when a listing URL carries filter/sort parameters – such variants stay out of the index. */
export function hasQueryParams(searchParams: Record<string, string | string[] | undefined>) {
  return Object.values(searchParams).some((v) => (Array.isArray(v) ? v.some(Boolean) : Boolean(v)));
}
