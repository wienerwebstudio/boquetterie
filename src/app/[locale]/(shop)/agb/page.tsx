import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/content";
import { routes } from "@/lib/urls";
import { CmsPage, GermanVersionNotice, legalMetadata } from "@/components/content/cms-page";
import { getI18n } from "@/i18n/server";

const SLUG = "agb";

export async function generateMetadata(): Promise<Metadata> {
  const [page, { m }] = await Promise.all([getPageBySlug(SLUG), getI18n()]);
  return legalMetadata(page, m.content.legal.termsTitle, routes.legal.terms);
}

export default async function Page() {
  const [page, { m }] = await Promise.all([getPageBySlug(SLUG), getI18n()]);
  if (!page) notFound();
  return <CmsPage page={page} eyebrow={m.content.legalEyebrow} crumbs={[{ label: page.title }]} dense before={<GermanVersionNotice />} />;
}
