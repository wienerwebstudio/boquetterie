import type { Metadata } from "next";
import type { ReactNode } from "react";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { getSettings } from "@/lib/cms";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Verwaltung",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Admin layout. The root layout wraps every page in the storefront shell
 * (header, announcement bar, footer); the admin hides that chrome via CSS
 * (`body:has(#bq-admin)`) and renders its own utilitarian dashboard shell.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [authed, settings] = await Promise.all([isAdminAuthenticated(), getSettings()]);
  return (
    <div id="bq-admin" className="font-sans">
      <style>{`
        body:has(#bq-admin) > header,
        body:has(#bq-admin) > footer,
        body:has(#bq-admin) > div.bg-forest.text-ivory { display: none !important; }
        #bq-admin :is(h1, h2, h3) { font-family: var(--font-sans); letter-spacing: -0.01em; font-weight: 600; }
      `}</style>
      {authed ? <AdminShell brandName={settings.brand.name}>{children}</AdminShell> : children}
    </div>
  );
}
