import type { MetadataRoute } from "next";
import { getAllProducts, getCategories, getLandingPages, getOccasions, getSettings } from "@/lib/cms";
import { routes } from "@/lib/urls";

const STATIC_PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: routes.extras, priority: 0.7, changeFrequency: "weekly" },
  { path: routes.subscription, priority: 0.7, changeFrequency: "monthly" },
  { path: routes.delivery, priority: 0.7, changeFrequency: "monthly" },
  { path: routes.about, priority: 0.5, changeFrequency: "monthly" },
  { path: routes.contact, priority: 0.5, changeFrequency: "yearly" },
  { path: routes.faq, priority: 0.6, changeFrequency: "monthly" },
  { path: routes.tracking, priority: 0.3, changeFrequency: "yearly" },
  { path: routes.legal.imprint, priority: 0.2, changeFrequency: "yearly" },
  { path: routes.legal.privacy, priority: 0.2, changeFrequency: "yearly" },
  { path: routes.legal.terms, priority: 0.2, changeFrequency: "yearly" },
  { path: routes.legal.withdrawal, priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, products, categories, occasions, landingPages] = await Promise.all([
    getSettings(), getAllProducts(), getCategories(), getOccasions(), getLandingPages(),
  ]);
  const base = settings.seo.siteUrl.replace(/\/$/, "");
  const abs = (path: string) => `${base}${path}`;
  const now = new Date();

  return [
    { url: abs(routes.home), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: abs(routes.shop), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: abs(routes.occasions), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...categories.filter((c) => c.slug !== "alle").map((c) => ({
      url: abs(routes.category(c.slug)), lastModified: now, changeFrequency: "weekly" as const, priority: 0.8,
    })),
    ...occasions.map((o) => ({
      url: abs(routes.occasion(o.slug)), lastModified: now, changeFrequency: "weekly" as const, priority: 0.8,
    })),
    ...products.map((p) => ({
      url: abs(routes.product(p.slug)), lastModified: now, changeFrequency: "weekly" as const, priority: 0.7,
      images: p.images.slice(0, 3).map((i) => abs(i.src)),
    })),
    ...landingPages.map((l) => ({
      url: abs(`/${l.slug}`), lastModified: now, changeFrequency: "monthly" as const, priority: 0.6,
    })),
    ...STATIC_PAGES.map((s) => ({ url: abs(s.path), lastModified: now, changeFrequency: s.changeFrequency, priority: s.priority })),
  ];
}
