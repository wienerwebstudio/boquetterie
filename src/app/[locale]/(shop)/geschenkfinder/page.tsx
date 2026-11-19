import type { Metadata } from "next";
import { getAllProducts, getOccasions, getSettings } from "@/lib/content";
import { breadcrumbLd, JsonLd } from "@/lib/seo";
import { PageHeader } from "@/components/content/page-header";
import { GiftFinder } from "@/components/giftfinder/gift-finder";
import { GIFT_FINDER_PATH } from "@/components/giftfinder/config";
import { findGifts, isComplete, parseGiftFinderQuery } from "@/components/giftfinder/scoring";
import { pageMetadata } from "@/lib/metadata";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return pageMetadata({
    title: m.shop.giftFinder.title,
    description: m.shop.giftFinder.metaDescription,
    path: GIFT_FINDER_PATH,
  });
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Server-rendered on every request: reads `?for=&occasion=&budget=` and, when all
 * three are set, pre-renders the results so shared links and refreshes work
 * without JavaScript. Live selections are handled by the client stepper.
 */
export default async function GiftFinderPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [occasions, products, settings, { m }] = await Promise.all([getOccasions(), getAllProducts(), getSettings(), getI18n()]);
  const t = m.shop.giftFinder;
  const query = parseGiftFinderQuery(params, occasions);
  const result = isComplete(query) ? findGifts(products, query) : null;

  return (
    <article>
      <PageHeader
        eyebrow={t.title}
        title={t.headerTitle}
        intro={t.intro}
        crumbs={[{ label: t.title }]}
      />
      <div className="container-x py-12 sm:py-16 lg:py-20">
        <GiftFinder occasions={occasions.map((o) => ({ slug: o.slug, name: o.name }))} initialQuery={query} initialResult={result} />
      </div>
      <JsonLd data={breadcrumbLd([{ name: m.shop.breadcrumbs.home, url: "/" }, { name: t.title, url: GIFT_FINDER_PATH }], settings)} />
    </article>
  );
}
