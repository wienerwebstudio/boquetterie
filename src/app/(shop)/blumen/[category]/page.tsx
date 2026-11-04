import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getCategories, getCategoryBySlug, getSettings } from "@/lib/cms";
import { routes } from "@/lib/urls";
import { ShopPage } from "@/components/shop/shop-page";
import type { RawSearchParams } from "@/components/shop/shop-listing";

type Params = Promise<{ category: string }>;

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.filter((c) => c.slug !== "alle").map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: category.seo.title,
    description: category.seo.description,
    alternates: { canonical: routes.category(category.slug) },
    ...(category.image && { openGraph: { images: [{ url: category.image }] } }),
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: Promise<RawSearchParams> }) {
  const { category: slug } = await params;
  if (slug === "alle") permanentRedirect(routes.shop);
  const [sp, categories, settings] = await Promise.all([searchParams, getCategories(), getSettings()]);
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();
  return <ShopPage category={category} categories={categories} settings={settings} searchParams={sp} />;
}
