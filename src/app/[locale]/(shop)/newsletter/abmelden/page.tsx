import type { Metadata } from "next";
import { NewsletterActionPage } from "@/components/content/newsletter-action-page";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.account.newsletterUnsubscribe.metaTitle, robots: { index: false, follow: false } };
}
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, { m }] = await Promise.all([searchParams, getI18n()]);
  const t = m.account.newsletterUnsubscribe;
  const outcomes: Record<string, { ok: boolean; title: string; text: string }> = {
    removed: { ok: true, title: t.removedTitle, text: t.removedText },
    invalid: { ok: true, title: t.invalidTitle, text: t.invalidText },
    fehler: { ok: false, title: t.errorTitle, text: t.errorText },
  };
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const id = str(sp.id);
  const token = str(sp.token);
  return (
    <NewsletterActionPage
      title={t.title}
      intro={t.intro}
      action="/api/newsletter/unsubscribe"
      button={t.button}
      hidden={id && token ? { id, token } : undefined}
      outcome={outcomes[str(sp.status)]}
    />
  );
}
