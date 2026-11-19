import type { Metadata } from "next";
import { getCategories, getCategoryBySlug, getSettings } from "@/lib/cms";
import { routes } from "@/lib/urls";
import { hasQueryParams, pageMetadata } from "@/lib/metadata";
import { ShopPage } from "@/components/shop/shop-page";
import type { RawSearchParams } from "@/components/shop/shop-listing";
import { getI18n } from "@/i18n/server";

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const [category, sp, { m }] = await Promise.all([getCategoryBySlug("alle"), searchParams, getI18n()]);
  return pageMetadata({
    title: category?.seo.title ?? m.shop.listing.fallbackTitle,
    description: category?.seo.description,
    path: routes.shop,
    // Filtered/sorted variants point to the base listing and stay out of the index.
    noindex: hasQueryParams(sp),
  });
}

export default async function ShopIndexPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const [sp, categories, settings, { m }] = await Promise.all([searchParams, getCategories(), getSettings(), getI18n()]);
  const category = categories.find((c) => c.slug === "alle") ?? {
    slug: "alle", name: m.shop.listing.fallbackName, headline: m.shop.listing.fallbackTitle, intro: "", seo: { title: "", description: "" }, showInNav: true, sortOrder: 0,
  };
  return <ShopPage category={category} categories={categories} settings={settings} searchParams={sp} />;
}
