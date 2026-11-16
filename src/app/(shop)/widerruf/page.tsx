import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/cms";
import { routes } from "@/lib/urls";
import Link from "next/link";
import { CmsPage, cmsMetadata } from "@/components/content/cms-page";

const SLUG = "widerruf";

export async function generateMetadata(): Promise<Metadata> {
  return cmsMetadata(await getPageBySlug(SLUG), "Widerrufsbelehrung", routes.legal.withdrawal);
}

export default async function Page() {
  const page = await getPageBySlug(SLUG);
  if (!page) notFound();
  return (
    <CmsPage
      page={page}
      eyebrow="Rechtliches"
      crumbs={[{ label: page.title }]}
      dense
      before={
        <div className="mb-12 flex max-w-2xl flex-col gap-4 rounded-md border border-line bg-white/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-[14.5px] leading-relaxed text-ink-muted">Du möchtest einen Kauf widerrufen? Das geht direkt online – mit sofortiger Eingangsbestätigung.</p>
          <Link href={routes.legal.withdrawalForm} className="inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-forest px-5 text-[14px] font-semibold text-ivory transition-colors hover:bg-forest-700">
            Vertrag hier widerrufen
          </Link>
        </div>
      }
    />
  );
}
