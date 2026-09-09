import type { Metadata } from "next";
import { getCategories, getCategoryBySlug, getSettings } from "@/lib/cms";
import { routes } from "@/lib/urls";
import { ShopPage } from "@/components/shop/shop-page";
import type { RawSearchParams } from "@/components/shop/shop-listing";

export async function generateMetadata(): Promise<Metadata> {
  const category = await getCategoryBySlug("alle");
  return {
    title: category?.seo.title ?? "Blumen online bestellen",
    description: category?.seo.description,
    alternates: { canonical: routes.shop },
  };
}

export default async function ShopIndexPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const [sp, categories, settings] = await Promise.all([searchParams, getCategories(), getSettings()]);
  const category = categories.find((c) => c.slug === "alle") ?? {
    slug: "alle", name: "Alle Blumen", headline: "Blumen online bestellen", intro: "", seo: { title: "", description: "" }, showInNav: true, sortOrder: 0,
  };
  return <ShopPage category={category} categories={categories} settings={settings} searchParams={sp} />;
}
