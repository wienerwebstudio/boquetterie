import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/cms";

const serif = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
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
