import type { Metadata } from "next";
import type { ReactNode } from "react";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { getSettings } from "@/lib/cms";
import { AdminShell } from "@/components/admin/admin-shell";
import "../globals.css";
import { fontVariables } from "@/app/fonts";

export const metadata: Metadata = {
  title: "Verwaltung",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Admin root layout – separate from the storefront (German only, no shop chrome). */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [authed, settings] = await Promise.all([isAdminAuthenticated(), getSettings()]);
  return (
    <html lang="de-AT" className={`${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col">
    <div id="bl-admin" className="font-sans">
      <style>{`#bl-admin :is(h1, h2, h3) { font-family: var(--font-sans); letter-spacing: -0.01em; font-weight: 600; }`}</style>
      {authed ? <AdminShell brandName={settings.brand.name}>{children}</AdminShell> : children}
    </div>
      </body>
    </html>
  );
}
