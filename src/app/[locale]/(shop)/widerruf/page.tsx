import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/cms";
import { routes } from "@/lib/urls";
import Link from "@/components/ui/link";
import { CmsPage, GermanVersionNotice, legalMetadata } from "@/components/content/cms-page";
import { getI18n } from "@/i18n/server";

const SLUG = "widerruf";

export async function generateMetadata(): Promise<Metadata> {
  const [page, { m }] = await Promise.all([getPageBySlug(SLUG), getI18n()]);
  return legalMetadata(page, m.content.legal.withdrawalTitle, routes.legal.withdrawal);
}

export default async function Page() {
  const [page, { m }] = await Promise.all([getPageBySlug(SLUG), getI18n()]);
  if (!page) notFound();
  return (
    <CmsPage
      page={page}
      eyebrow={m.content.legalEyebrow}
      crumbs={[{ label: page.title }]}
      dense
      before={
        <>
          <GermanVersionNotice />
          <div className="mb-12 flex max-w-2xl flex-col gap-4 rounded-md border border-line bg-white/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <p className="text-[14.5px] leading-relaxed text-ink-muted">{m.content.legal.withdrawalTeaser}</p>
            <Link href={routes.legal.withdrawalForm} className="inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-forest px-5 text-[14px] font-semibold text-ivory transition-colors hover:bg-forest-700">
              {m.content.legal.withdrawalLink}
            </Link>
          </div>
        </>
      }
    />
  );
}
