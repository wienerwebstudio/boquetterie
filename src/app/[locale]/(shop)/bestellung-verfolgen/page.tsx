import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { getSettings } from "@/lib/cms";
import { routes } from "@/lib/urls";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { TrackingForm } from "@/components/checkout/tracking-form";
import { pageMetadata } from "@/lib/metadata";
import { getI18n } from "@/i18n/server";
import { rich } from "@/components/checkout/rich-text";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return pageMetadata({
    title: m.checkout.tracking.metaTitle,
    description: m.checkout.tracking.metaDescription,
    path: routes.tracking,
  });
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function TrackingPage({ searchParams }: Props) {
  const [sp, settings, { m }] = await Promise.all([searchParams, getSettings(), getI18n()]);
  const t = m.checkout.tracking;
  const initial = typeof sp.nr === "string" ? sp.nr : "";
  const contactEmail = settings.brand.email.startsWith("[") ? null : settings.brand.email;

  return (
    <div className="container-x py-10 lg:py-16">
      <Breadcrumbs items={[{ label: t.breadcrumb }]} className="mb-8" />
      <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <div className="max-w-xl">
          <p className="eyebrow mb-3">{t.eyebrow}</p>
          <h1 className="display-2 text-ink">{t.title}</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
            {t.intro}
          </p>
          <div className="mt-8">
            <TrackingForm initialOrderId={initial} />
          </div>
        </div>
        <aside className="self-start rounded-lg bg-ivory-100 p-6 text-[14px] leading-relaxed text-ink-muted sm:p-8">
          <p className="font-semibold text-ink">{t.goodToKnow}</p>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-5">
            <li>{rich(t.tipNumber, { prefix: <span className="font-semibold text-ink">BQ-</span> })}</li>
            <li>{t.tipLink}</li>
            <li>{t.tipRecipient}</li>
          </ul>
          <p className="mt-5">
            {t.noConfirmation}{" "}
            {contactEmail
              ? rich(t.writeUs, { email: <a href={`mailto:${contactEmail}`} className="font-semibold text-forest underline underline-offset-2">{contactEmail}</a> })
              : rich(t.contactUs, { link: <Link href={routes.contact} className="font-semibold text-forest underline underline-offset-2">{t.contactLink}</Link> })}
          </p>
        </aside>
      </div>
    </div>
  );
}
