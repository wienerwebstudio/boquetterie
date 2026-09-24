import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/cms";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings();
  return {
    name: settings.seo.defaultTitle,
    short_name: settings.brand.name,
    description: settings.seo.defaultDescription,
    lang: "de-AT",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#faf7f2",
    icons: [
      { src: "/images/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/images/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
