import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { pageMetadata } from "@/lib/metadata";
import { routes } from "@/lib/urls";
import { PageHeader } from "@/components/content/page-header";
import { WithdrawalForm } from "@/components/content/withdrawal-form";
import { fmtRich } from "@/components/content/rich-text";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return pageMetadata({
    title: m.content.withdrawalPage.title,
    description: m.content.withdrawalPage.metaDescription,
    path: routes.legal.withdrawalForm,
  });
}

/** The website's withdrawal function (FAGG / Art. 11a Consumer Rights Directive). */
export default async function WithdrawalPage() {
  const { m } = await getI18n();
  const t = m.content.withdrawalPage;
  return (
    <article>
      <PageHeader
        eyebrow={m.content.legalEyebrow}
        title={t.title}
        intro={t.intro}
        crumbs={[{ label: m.content.legal.withdrawalTitle, href: routes.legal.withdrawal }, { label: t.title }]}
      />
      <div className="container-x grid gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16">
        <WithdrawalForm />
        <aside className="h-fit rounded-md border border-line bg-ivory-100/70 p-5 text-[14px] leading-relaxed text-ink-muted sm:p-6">
          <p className="font-semibold text-ink">{m.content.goodToKnow}</p>
          <p className="mt-2">
            {t.noRightOfWithdrawal}
          </p>
          <p className="mt-3">
            {fmtRich(t.details, { link: <Link href={routes.legal.withdrawal}>{m.content.legal.withdrawalTitle}</Link>, email: "office@blumora.at" })}
          </p>
        </aside>
      </div>
    </article>
  );
}
