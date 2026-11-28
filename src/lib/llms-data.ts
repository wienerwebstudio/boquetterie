import "server-only";
import { getAllProducts, getCategories, getDeliveryZones, getExtras, getFaqs, getLandingPages, getOccasions, getPages, getReviews, getSettings } from "@/lib/cms";
import type { LlmsData } from "@/lib/llms";

export async function loadLlmsData(): Promise<LlmsData> {
  const [settings, products, categories, occasions, extras, zones, faqs, reviews, landingPages, pages] = await Promise.all([
    getSettings(), getAllProducts(), getCategories(), getOccasions(), getExtras(), getDeliveryZones(), getFaqs(), getReviews(), getLandingPages(), getPages(),
  ]);
  return { settings, products, categories, occasions, extras, zones, faqs, reviews, landingPages, pages };
}
