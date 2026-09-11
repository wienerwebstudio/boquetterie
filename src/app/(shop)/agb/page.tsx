import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/cms";
import { routes } from "@/lib/urls";
import { CmsPage, cmsMetadata } from "@/components/content/cms-page";

const SLUG = "agb";

export async function generateMetadata(): Promise<Metadata> {
  return cmsMetadata(await getPageBySlug(SLUG), "Allgemeine Geschäftsbedingungen", routes.legal.terms);
}

export default async function Page() {
  const page = await getPageBySlug(SLUG);
  if (!page) notFound();
  return <CmsPage page={page} eyebrow="Rechtliches" crumbs={[{ label: page.title }]} />;
}
