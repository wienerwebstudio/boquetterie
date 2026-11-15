import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { isPricePending } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import {
  getSettings, getHomepage, getOccasions, getCategories, getProductsBySlugs, getAllProducts,
  getReviews, getFaqsByIds, getSubscription,
} from "@/lib/cms";
import { JsonLd, organizationLd } from "@/lib/seo";
import { getDeliveryZones } from "@/lib/cms";
import { isSameDayPossibleNow } from "@/lib/delivery";

/** Re-render every 5 minutes so the time-based "Heute lieferbar" badge stays honest. */
export const revalidate = 300;
import { Hero } from "@/components/home/hero";
import { TrustBar } from "@/components/home/trust-bar";
import { OccasionGrid } from "@/components/home/occasion-grid";
import { GiftFinderEntry } from "@/components/home/gift-finder-entry";
import { Bestsellers } from "@/components/home/bestsellers";
import { Collections } from "@/components/home/collections";
import { HowItWorks } from "@/components/home/how-it-works";
import { Seasonal } from "@/components/home/seasonal";
import { Editorial } from "@/components/home/editorial";
import { SubscriptionTeaser } from "@/components/home/subscription-teaser";
import { Reviews } from "@/components/home/reviews";
import { FaqTeaser } from "@/components/home/faq-teaser";
import { Newsletter } from "@/components/home/newsletter";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return pageMetadata({ title: settings.seo.defaultTitle, absoluteTitle: true, description: settings.seo.defaultDescription, path: "/" });
}

export default async function HomePage() {
  const [settings, home, occasions, categories, reviews, subscription] = await Promise.all([
    getSettings(), getHomepage(), getOccasions(), getCategories(), getReviews(), getSubscription(),
  ]);
  const [bestsellers, seasonalProducts, faqs, zones, allProducts] = await Promise.all([
    getProductsBySlugs(home.bestsellers.productSlugs),
    getProductsBySlugs(home.seasonal.productSlugs),
    getFaqsByIds(home.faq.ids),
    getDeliveryZones(),
    getAllProducts(),
  ]);
  // Hero facts are derived from live data, so they can't drift from the catalog or the zones.
  const priced = allProducts.filter((p) => p.active && !isPricePending(p));
  const activeZones = zones.filter((z) => z.active);
  const heroFacts = [
    ...(priced.length ? [`Sträuße ab ${formatPrice(Math.min(...priced.map((p) => p.basePrice)))}`] : []),
    ...(activeZones.length && activeZones.every((z) => z.region === "Wien") ? ["Lieferung in ganz Wien"] : []),
    ...(settings.greetingCard.freeCardIncluded ? ["Grußkarte inklusive"] : []),
  ];
  const sameDayNow = isSameDayPossibleNow(zones, settings);

  const pick = <T extends { slug: string }>(slugs: string[], all: T[]) =>
    slugs.map((s) => all.find((x) => x.slug === s)).filter((x): x is T => Boolean(x));

  const homeOccasions = pick(home.occasions.slugs, occasions).slice(0, 6);
  const homeCollections = pick(home.collections.slugs, categories);
  const homeReviews = reviews.slice(0, 6);
  const showSubscription = settings.subscriptionEnabled && subscription.enabled;

  return (
    <>
      <JsonLd data={organizationLd(settings)} />
      <Hero hero={home.hero} facts={heroFacts} />
      <TrustBar items={settings.trust} />
      {/* Products first: what it costs and what it looks like belongs right under the hero. */}
      <Bestsellers content={home.bestsellers} products={bestsellers.slice(0, 8)} showSameDay={sameDayNow} />
      <OccasionGrid content={home.occasions} occasions={homeOccasions} />
      <GiftFinderEntry />
      <Collections content={home.collections} categories={homeCollections} />
      <Seasonal content={home.seasonal} products={seasonalProducts.slice(0, 3)} />
      <HowItWorks content={home.howItWorks} />
      <Editorial content={home.editorial} />
      {showSubscription && <SubscriptionTeaser content={home.subscription} config={subscription} />}
      <Reviews content={home.reviews} reviews={homeReviews} />
      <FaqTeaser content={home.faq} faqs={faqs} />
      {settings.newsletterEnabled && <Newsletter content={home.newsletter} />}
    </>
  );
}
