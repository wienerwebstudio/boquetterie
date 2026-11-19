import { getSettings } from "@/lib/cms";
import { SiteShell } from "@/components/layout/site-shell";

/** Storefront layout: announcement bar, header, footer, cart drawer, search. */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return <SiteShell settings={settings}>{children}</SiteShell>;
}
