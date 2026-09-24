import type { Metadata } from "next";
import { getSettings } from "@/lib/cms";
import { SiteShell } from "@/components/layout/site-shell";
import { NotFoundView } from "@/components/content/not-found-view";

export const metadata: Metadata = { title: "Seite nicht gefunden", robots: { index: false } };

/** Root-level 404 (outside the storefront route group) – still wrapped in the shop shell. */
export default async function NotFound() {
  const settings = await getSettings();
  return (
    <SiteShell settings={settings}>
      <NotFoundView />
    </SiteShell>
  );
}
