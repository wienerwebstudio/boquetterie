import type { MetadataRoute } from "next";
import { getAllProducts, getCategories, getLandingPages, getOccasions, getPageBySlug, getSettings } from "@/lib/cms";
import { matchesCategory } from "@/lib/catalog";
import { isPlaceholderPage } from "@/components/content/cms-page";
import { routes } from "@/lib/urls";

type Freq = MetadataRoute.Sitemap[number]["changeFrequency"];

const STATIC_PAGES: { path: string; priority: number; changeFrequency: Freq }[] = [
  { path: routes.extras, priority: 0.6, changeFrequency: "weekly" },
  { path: routes.giftFinder, priority: 0.6, changeFrequency: "monthly" },
  { path: routes.delivery, priority: 0.7, changeFrequency: "monthly" },
  { path: routes.business, priority: 0.5, changeFrequency: "monthly" },
  { path: routes.reminder, priority: 0.4, changeFrequency: "yearly" },
  { path: routes.about, priority: 0.5, changeFrequency: "monthly" },
  { path: routes.contact, priority: 0.5, changeFrequency: "yearly" },
  { path: routes.faq, priority: 0.6, changeFrequency: "monthly" },
];

/** CMS pages that are only listed once they hold real content (no operator placeholders). */
const CMS_PAGES: { slug: string; path: string }[] = [
  { slug: "impressum", path: routes.legal.imprint },
  { slug: "datenschutz", path: routes.legal.privacy },
  { slug: "agb", path: routes.legal.terms },
  { slug: "widerruf", path: routes.legal.withdrawal },
];

/**
 * Only indexable URLs: no empty listings, no placeholder pages, no utility pages
 * (tracking, cart, checkout, account, search). `lastModified` is left out on
 * purpose – the content has no reliable change dates, and "now" on every URL
 * teaches crawlers to ignore the field.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, products, categories, occasions, landingPages, cmsPages] = await Promise.all([
    getSettings(), getAllProducts(), getCategories(), getOccasions(), getLandingPages(),
    Promise.all(CMS_PAGES.map(async (p) => ({ ...p, page: await getPageBySlug(p.slug) }))),
  ]);
  const base = settings.seo.siteUrl.replace(/\/$/, "");
  const abs = (path: string) => `${base}${path}`;
  const active = products.filter((p) => p.active);

  return [
    { url: abs(routes.home), changeFrequency: "daily", priority: 1 },
    { url: abs(routes.shop), changeFrequency: "daily", priority: 0.9 },
    { url: abs(routes.occasions), changeFrequency: "weekly", priority: 0.8 },
    ...categories
      .filter((c) => c.slug !== "alle" && active.some((p) => matchesCategory(p, c)))
      .map((c) => ({ url: abs(routes.category(c.slug)), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...occasions.map((o) => ({ url: abs(routes.occasion(o.slug)), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...active.map((p) => ({
      url: abs(routes.product(p.slug)), changeFrequency: "weekly" as const, priority: 0.7,
      images: p.images.slice(0, 3).map((i) => abs(i.src)),
    })),
    ...landingPages.map((l) => ({ url: abs(`/${l.slug}`), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...STATIC_PAGES.map((s) => ({ url: abs(s.path), changeFrequency: s.changeFrequency, priority: s.priority })),
    ...(settings.subscriptionEnabled ? [{ url: abs(routes.subscription), changeFrequency: "monthly" as const, priority: 0.6 }] : []),
    ...cmsPages
      .filter((p) => p.page && !isPlaceholderPage(p.page))
      .map((p) => ({ url: abs(p.path), changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
