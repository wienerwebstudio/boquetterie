import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllProducts, getCategories, getExtras, getProductBySlug, getReviews, getSettings } from "@/lib/cms";
import { primaryImage } from "@/lib/catalog";
import { JsonLd, breadcrumbLd, productLd } from "@/lib/seo";
import { routes } from "@/lib/urls";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ProductHero } from "@/components/product/product-hero";
import { ProductDetails } from "@/components/product/details";
import { ProductReviews } from "@/components/product/reviews";
import { RelatedProducts, pickRelated } from "@/components/product/related";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produkt nicht gefunden" };
  const image = primaryImage(product);
  return {
    title: product.seo.title,
    description: product.seo.description,
    alternates: { canonical: routes.product(product.slug) },
    openGraph: {
      type: "website",
      title: product.seo.title,
      description: product.seo.description,
      images: [{ url: image.src, alt: image.alt }],
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [extras, settings, allReviews, allProducts, categories] = await Promise.all([
    getExtras(), getSettings(), getReviews(), getAllProducts(), getCategories(),
  ]);
  const category = categories.find((c) => c.slug === product.category) ?? null;
  const reviews = allReviews.filter((r) => r.productSlug === product.slug);
  const related = pickRelated(allProducts, product);

  const crumbs = [
    { label: "Blumen", href: routes.shop },
    ...(category ? [{ label: category.name, href: routes.category(category.slug) }] : []),
    { label: product.name },
  ];

  return (
    <>
      <JsonLd data={productLd(product, settings)} />
      <JsonLd data={breadcrumbLd([{ name: "Start", url: "/" }, ...crumbs.map((c) => ({ name: c.label, url: c.href ?? routes.product(product.slug) }))], settings)} />

      <div className="container-x pt-4 sm:pt-6">
        <Breadcrumbs items={crumbs} />
        <div className="mt-5 sm:mt-8">
          <ProductHero product={product} extras={extras} greetingCard={settings.greetingCard} />
        </div>
      </div>

      <ProductDetails product={product} />
      <ProductReviews reviews={reviews} productName={product.name} />
      <RelatedProducts products={related} />
    </>
  );
}
