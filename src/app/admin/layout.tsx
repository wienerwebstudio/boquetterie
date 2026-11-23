import type { Metadata } from "next";
import type { ReactNode } from "react";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { getSettings } from "@/lib/cms";
import { getLocalNow } from "@/lib/delivery";
import { formatDateLong } from "@/lib/format";
import { AdminShell } from "@/components/admin/admin-shell";
import { countNewInbox } from "@/lib/custom-requests";
import "../globals.css";
import "./admin.css";
import { fontVariables } from "@/app/fonts";

export const metadata: Metadata = {
  title: "Verwaltung",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Greeting by the shop's local time of day. */
function greetingFor(minutes: number) {
  const h = Math.floor(minutes / 60);
  if (h >= 5 && h < 11) return "Guten Morgen";
  if (h >= 11 && h < 18) return "Guten Tag";
  return "Guten Abend";
}

/** Admin root layout – separate from the storefront (German only, no shop chrome). */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [authed, settings] = await Promise.all([isAdminAuthenticated(), getSettings()]);
  const newRequests = authed ? await countNewInbox() : 0;
  const now = getLocalNow(settings.timezone);
  return (
    <html lang="de-AT" className={`${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col">
        <div id="bl-admin" className="flex-1 font-sans">
          {authed ? (
            <AdminShell brandName={settings.brand.name} greeting={greetingFor(now.minutes)} today={formatDateLong(now.date)} badges={{ "/admin/anfragen": newRequests }}>
              {children}
            </AdminShell>
          ) : (
            children
          )}
        </div>
      </body>
    </html>
  );
}
