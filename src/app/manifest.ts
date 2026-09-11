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
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
