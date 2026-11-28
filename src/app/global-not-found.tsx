import type { Metadata } from "next";
import "./globals.css";
import { getSettings } from "@/lib/cms";
import { fontVariables } from "@/app/fonts";
import { SiteShell } from "@/components/layout/site-shell";
import { NotFoundView } from "@/components/content/not-found-view";
import { I18nProvider } from "@/i18n/client";
import { germanMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n("de");
  return { title: m.layout.notFound.metaTitle, robots: { index: false } };
}

/** 404 for URLs that match no route at all – German, wrapped in the shop shell. */
export default async function GlobalNotFound() {
  const settings = await getSettings();
  return (
    <html lang="de-AT" className={`${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col">
        <I18nProvider locale="de" messages={germanMessages}>
          <SiteShell settings={settings}>
            <NotFoundView />
          </SiteShell>
        </I18nProvider>
      </body>
    </html>
  );
}
