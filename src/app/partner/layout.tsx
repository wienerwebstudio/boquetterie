import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../globals.css";
import { fontVariables } from "@/app/fonts";

export const metadata: Metadata = {
  title: { default: "Partner-Portal | Blumora", template: "%s | Partner-Portal Blumora" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const viewport: Viewport = { themeColor: "#faf7f2", width: "device-width", initialScale: 1 };

export const dynamic = "force-dynamic";

/**
 * Partner-Portal root layout – outside the localized shop (German only, no shop chrome,
 * never indexed). See docs/PARTNER-PORTAL.md.
 */
export default function PartnerLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de-AT" className={`${fontVariables} h-full`}>
      <body className="min-h-full bg-ivory font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
