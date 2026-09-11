import type { Metadata } from "next";
import { getAllProducts, getOccasions, getSettings } from "@/lib/cms";
import { breadcrumbLd, JsonLd } from "@/lib/seo";
import { PageHeader } from "@/components/content/page-header";
import { GiftFinder } from "@/components/giftfinder/gift-finder";
import { GIFT_FINDER_PATH } from "@/components/giftfinder/config";
import { findGifts, isComplete, parseGiftFinderQuery } from "@/components/giftfinder/scoring";

const TITLE = "Geschenk-Finder";

export const metadata: Metadata = {
  title: TITLE,
  description: "Für wen? Zu welchem Anlass? Welches Budget? Drei Antworten – und wir zeigen dir passende Sträuße, frisch gebunden in Wien.",
  alternates: { canonical: GIFT_FINDER_PATH },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Server-rendered on every request: reads `?for=&occasion=&budget=` and, when all
 * three are set, pre-renders the results so shared links and refreshes work
 * without JavaScript. Live selections are handled by the client stepper.
 */
export default async function GiftFinderPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [occasions, products, settings] = await Promise.all([getOccasions(), getAllProducts(), getSettings()]);
  const query = parseGiftFinderQuery(params, occasions);
  const result = isComplete(query) ? findGifts(products, query) : null;

  return (
    <article>
      <PageHeader
        eyebrow={TITLE}
        title="Für wen? Zu welchem Anlass? Welches Budget?"
        intro="Drei Antworten, und wir zeigen dir Sträuße, die passen. Kein Quiz – nur eine Abkürzung zum richtigen Strauß."
        crumbs={[{ label: TITLE }]}
      />
      <div className="container-x py-12 sm:py-16 lg:py-20">
        <GiftFinder occasions={occasions.map((o) => ({ slug: o.slug, name: o.name }))} initialQuery={query} initialResult={result} />
      </div>
      <JsonLd data={breadcrumbLd([{ name: "Start", url: "/" }, { name: TITLE, url: GIFT_FINDER_PATH }], settings)} />
    </article>
  );
}
