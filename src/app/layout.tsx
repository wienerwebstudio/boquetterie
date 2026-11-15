import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getSettings } from "@/lib/cms";

// Self-hosted variable fonts (SIL OFL, see src/fonts/LICENSE-*): no request to
// Google at build or run time, one file per style instead of one per weight.
const serif = localFont({
  variable: "--font-serif",
  display: "swap",
  src: [
    { path: "../fonts/cormorant-garamond-latin-wght-normal.woff2", weight: "300 700", style: "normal" },
    { path: "../fonts/cormorant-garamond-latin-wght-italic.woff2", weight: "300 700", style: "italic" },
  ],
  fallback: ["Georgia", "serif"],
});

const sans = localFont({
  variable: "--font-sans",
  display: "swap",
  src: [{ path: "../fonts/manrope-latin-wght-normal.woff2", weight: "200 800", style: "normal" }],
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    metadataBase: new URL(settings.seo.siteUrl),
    title: {
      default: settings.seo.defaultTitle,
      template: `%s | ${settings.brand.name}`,
    },
    description: settings.seo.defaultDescription,
    openGraph: {
      type: "website",
      locale: "de_AT",
      siteName: settings.brand.name,
      title: settings.seo.defaultTitle,
      description: settings.seo.defaultDescription,
      images: [{ url: "/images/hero/hero-wide.jpg", width: 1600, height: 900 }],
    },
    robots: { index: true, follow: true },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-AT" className={`${serif.variable} ${sans.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
