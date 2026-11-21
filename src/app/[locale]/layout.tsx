import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { getSettings } from "@/lib/content";
import { fontVariables } from "@/app/fonts";
import { isLiveLocale, liveLocales, LOCALE_INFO, type Locale } from "@/i18n/config";
import { RootI18nProvider } from "@/i18n/scope";

/** Live languages are prerendered; any other locale answers 404 (see LIVE_LOCALES). */
export function generateStaticParams() {
  return liveLocales().map((locale) => ({ locale }));
}

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const [settings, { locale }] = await Promise.all([getSettings(), params]);
  const og = LOCALE_INFO[(isLiveLocale(locale) ? locale : "de") as Locale].og;
  return {
    metadataBase: new URL(settings.seo.siteUrl),
    title: {
      default: settings.seo.defaultTitle,
      template: `%s | ${settings.brand.name}`,
    },
    description: settings.seo.defaultDescription,
    openGraph: {
      type: "website",
      locale: og,
      siteName: settings.brand.name,
      images: [{ url: "/images/hero/hero-wien-tram-og.jpg", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
    // Search Console / Bing Webmaster Tools ownership check via meta tag (env-activated).
    verification: {
      ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
      ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
    },
    // No canonical here: it would declare the home page canonical for every route
    // that doesn't set its own (search, cart, account, 404 …).
  };
}

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  width: "device-width",
  initialScale: 1,
};

/** Root layout of the storefront: one per language (`lang` and text direction). */
export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLiveLocale(locale)) notFound();
  const info = LOCALE_INFO[locale];
  return (
    <html lang={info.htmlLang} dir={info.dir} className={`${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col">
        <RootI18nProvider locale={locale}>{children}</RootI18nProvider>
      </body>
    </html>
  );
}
