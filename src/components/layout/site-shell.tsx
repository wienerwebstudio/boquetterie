import type { SiteSettings } from "@/types";
import { getCategories, getOccasions } from "@/lib/content";
import { AnnouncementBar } from "./announcement-bar";
import { Header } from "./header";
import { LanguageHint } from "./language-hint";
import { Footer } from "./footer";
import { FooterSlot } from "./footer-slot";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { SearchOverlay } from "@/components/layout/search-overlay";
import { ToastViewport } from "@/components/ui/toast-viewport";
import { ConsentBanner } from "@/components/consent/consent-banner";
import { Analytics } from "@/components/analytics/analytics";
import { getI18n } from "@/i18n/server";

export async function SiteShell({ settings, children }: { settings: SiteSettings; children: React.ReactNode }) {
  const [categories, occasions, { m }] = await Promise.all([getCategories(), getOccasions(), getI18n()]);
  const navCategories = categories.filter((c) => c.showInNav).map((c) => ({ slug: c.slug, name: c.name }));
  const navOccasions = occasions.filter((o) => o.featured).map((o) => ({ slug: o.slug, name: o.name, image: o.image }));

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-forest focus:px-4 focus:py-2 focus:text-ivory">
        {m.layout.skipToContent}
      </a>
      <LanguageHint />
      {settings.announcement.enabled && settings.announcement.messages.length > 0 && (
        <AnnouncementBar messages={settings.announcement.messages} />
      )}
      <Header settings={settings} categories={navCategories} occasions={navOccasions} />
      <main id="main" className="flex-1">{children}</main>
      <FooterSlot brandName={settings.brand.name}>
        <Footer settings={settings} />
      </FooterSlot>
      <CartDrawer cardsEnabled={settings.greetingCard?.enabled === true} />
      <SearchOverlay />
      <ToastViewport />
      <ConsentBanner />
      <Analytics />
    </>
  );
}
