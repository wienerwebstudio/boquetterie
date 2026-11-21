import type { Metadata } from "next";
import { NewsletterActionPage } from "@/components/content/newsletter-action-page";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.account.newsletterConfirm.metaTitle, robots: { index: false, follow: false } };
}
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, { m }] = await Promise.all([searchParams, getI18n()]);
  const t = m.account.newsletterConfirm;
  const outcomes: Record<string, { ok: boolean; title: string; text: string }> = {
    confirmed: { ok: true, title: t.confirmedTitle, text: t.confirmedText },
    already: { ok: true, title: t.alreadyTitle, text: t.alreadyText },
    invalid: { ok: false, title: t.invalidTitle, text: t.invalidText },
    fehler: { ok: false, title: t.errorTitle, text: t.errorText },
  };
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const outcome = outcomes[str(sp.status)];
  const id = str(sp.id);
  const token = str(sp.token);
  return (
    <NewsletterActionPage
      title={t.title}
      intro={t.intro}
      action="/api/newsletter/confirm"
      button={t.button}
      hidden={id && token ? { id, token } : undefined}
      outcome={outcome}
    />
  );
}
