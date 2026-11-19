import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllProducts, getCategories, getCategoryBySlug, getSettings } from "@/lib/content";
import { matchesCategory } from "@/lib/catalog";
import { hasQueryParams, pageMetadata } from "@/lib/metadata";
import { routes } from "@/lib/urls";
import { ShopPage } from "@/components/shop/shop-page";
import type { RawSearchParams } from "@/components/shop/shop-listing";

type Params = Promise<{ category: string }>;

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.filter((c) => c.slug !== "alle").map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const { category: slug } = await params;
  const [category, sp, products] = await Promise.all([getCategoryBySlug(slug), searchParams, getAllProducts()]);
  if (!category) return {};
  // Empty listings (e.g. "Bestseller" before there are any) and filtered variants stay out of the index.
  const empty = !products.some((p) => p.active && matchesCategory(p, category));
  return pageMetadata({
    title: category.seo.title,
    description: category.seo.description,
    path: routes.category(category.slug),
    ...(category.image && { image: { url: category.image } }),
    noindex: empty || hasQueryParams(sp),
  });
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: Promise<RawSearchParams> }) {
  const { category: slug } = await params;
  const [sp, categories, settings] = await Promise.all([searchParams, getCategories(), getSettings()]);
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();
  return <ShopPage category={category} categories={categories} settings={settings} searchParams={sp} />;
}
