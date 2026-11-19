import type { Metadata } from "next";
import { NotFoundView } from "@/components/content/not-found-view";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.layout.notFound.metaTitle, robots: { index: false } };
}

export default function NotFound() {
  return <NotFoundView />;
}
