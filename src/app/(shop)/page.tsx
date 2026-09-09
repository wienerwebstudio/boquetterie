import type { Metadata } from "next";
import {
  getSettings, getHomepage, getOccasions, getCategories, getProductsBySlugs, getExtras,
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
import { Bestsellers } from "@/components/home/bestsellers";
import { Collections } from "@/components/home/collections";
import { HowItWorks } from "@/components/home/how-it-works";
import { Seasonal } from "@/components/home/seasonal";
import { Editorial } from "@/components/home/editorial";
import { ExtrasTeaser } from "@/components/home/extras-teaser";
import { SubscriptionTeaser } from "@/components/home/subscription-teaser";
import { Reviews } from "@/components/home/reviews";
import { Gallery } from "@/components/home/gallery";
import { FaqTeaser } from "@/components/home/faq-teaser";
import { Newsletter } from "@/components/home/newsletter";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: { absolute: settings.seo.defaultTitle },
    description: settings.seo.defaultDescription,
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const [settings, home, occasions, categories, extras, reviews, subscription] = await Promise.all([
    getSettings(), getHomepage(), getOccasions(), getCategories(), getExtras(), getReviews(), getSubscription(),
  ]);
  const [bestsellers, seasonalProducts, faqs, zones] = await Promise.all([
    getProductsBySlugs(home.bestsellers.productSlugs),
    getProductsBySlugs(home.seasonal.productSlugs),
    getFaqsByIds(home.faq.ids),
    getDeliveryZones(),
  ]);
  const sameDayNow = isSameDayPossibleNow(zones, settings);

  const pick = <T extends { slug: string }>(slugs: string[], all: T[]) =>
    slugs.map((s) => all.find((x) => x.slug === s)).filter((x): x is T => Boolean(x));

  const homeOccasions = pick(home.occasions.slugs, occasions).slice(0, 9);
  const homeCollections = pick(home.collections.slugs, categories);
  const homeExtras = extras.slice(0, 6);
  const homeReviews = reviews.slice(0, 6);
  const showSubscription = settings.subscriptionEnabled && subscription.enabled;

  return (
    <>
      <JsonLd data={organizationLd(settings)} />
      <Hero hero={home.hero} />
      <TrustBar items={settings.trust} />
      <OccasionGrid content={home.occasions} occasions={homeOccasions} />
      <Bestsellers content={home.bestsellers} products={bestsellers.slice(0, 8)} showSameDay={sameDayNow} />
      <Collections content={home.collections} categories={homeCollections} />
      <HowItWorks content={home.howItWorks} />
      <Seasonal content={home.seasonal} products={seasonalProducts.slice(0, 3)} />
      <Editorial content={home.editorial} />
      <ExtrasTeaser content={home.extras} extras={homeExtras} />
      {showSubscription && <SubscriptionTeaser content={home.subscription} config={subscription} />}
      <Reviews content={home.reviews} reviews={homeReviews} />
      <Gallery content={home.gallery} />
      <FaqTeaser content={home.faq} faqs={faqs} />
      {settings.newsletterEnabled && <Newsletter content={home.newsletter} />}
    </>
  );
}
