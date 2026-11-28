import type { Category, SiteSettings } from "@/types";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd, breadcrumbLd } from "@/lib/seo";
import { routes } from "@/lib/urls";
import { CategoryStrip } from "./category-strip";
import { ShopListing, type RawSearchParams } from "./shop-listing";
import { getI18n } from "@/i18n/server";

/** Page body for /blumen and /blumen/[category]: compact header, collection strip, listing. */
export async function ShopPage({ category, categories, settings, searchParams }: {
  category: Category; categories: Category[]; settings: SiteSettings; searchParams: RawSearchParams;
}) {
  const { m } = await getI18n();
  const isAll = category.slug === "alle";
  const pathname = routes.category(category.slug);
  const crumbs = isAll ? [{ label: m.shop.breadcrumbs.flowers }] : [{ label: m.shop.breadcrumbs.flowers, href: routes.shop }, { label: category.name }];
  return (
    <div className="container-x pb-20 pt-6 sm:pt-8 lg:pb-28">
      <JsonLd data={breadcrumbLd([{ name: m.shop.breadcrumbs.flowers, url: routes.shop }, ...(isAll ? [] : [{ name: category.name, url: pathname }])], settings)} />
      <Breadcrumbs items={crumbs} />
      <header className="mt-6 max-w-3xl sm:mt-8">
        <p className="eyebrow mb-3">{isAll ? m.shop.listing.allBouquets : m.shop.listing.collection}</p>
        <h1 className="display-2 text-balance text-ink animate-fade-up">{category.headline}</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-muted sm:text-base">{category.intro}</p>
      </header>
      <CategoryStrip categories={categories} active={category.slug} className="mt-7 sm:mt-8" />
      <div className="mt-8 border-t border-line pt-8 sm:mt-10 sm:pt-10">
        <ShopListing searchParams={searchParams} pathname={pathname} fixed={isAll ? {} : { category: category.slug }} />
      </div>
    </div>
  );
}
