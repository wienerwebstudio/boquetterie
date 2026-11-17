import "server-only";
import type { Metadata } from "next";
import { getSettings } from "@/lib/cms";

const DEFAULT_OG_IMAGE = { url: "/images/hero/hero-blumen-og.jpg", width: 1600, height: 900 };

export interface PageMetaInput {
  /** Page title without the brand – the root layout's template appends it. */
  title: string;
  description?: string;
  /** Canonical path, e.g. "/blumen/rosen". */
  path: string;
  image?: { url: string; alt?: string };
  /** Keep the page out of the index (still followed). */
  noindex?: boolean;
  /** Use the title as is, without the brand suffix (home page). */
  absoluteTitle?: boolean;
}

/**
 * One place for per-page metadata so title, description, canonical and Open
 * Graph always agree. A page-level `openGraph` replaces the layout's object
 * completely in Next, so site name, locale and URL are repeated here.
 */
export async function pageMetadata(input: PageMetaInput): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      type: "website",
      locale: "de_AT",
      siteName: settings.brand.name,
      title: input.title,
      description: input.description,
      url: input.path,
      images: [input.image ?? DEFAULT_OG_IMAGE],
    },
    ...(input.noindex && { robots: { index: false, follow: true } }),
  };
}

/** True when a listing URL carries filter/sort parameters – such variants stay out of the index. */
export function hasQueryParams(searchParams: Record<string, string | string[] | undefined>) {
  return Object.values(searchParams).some((v) => (Array.isArray(v) ? v.some(Boolean) : Boolean(v)));
}
