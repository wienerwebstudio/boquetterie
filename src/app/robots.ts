import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/cms";
import { routes } from "@/lib/urls";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings();
  const base = settings.seo.siteUrl.replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [routes.admin, "/api", routes.checkout, routes.account, routes.cart] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
