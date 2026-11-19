import type { Metadata } from "next";
import Image from "next/image";
import { Building2, CalendarDays, Gift, type LucideProps } from "lucide-react";
import { getSettings } from "@/lib/cms";
import { routes } from "@/lib/urls";
import { breadcrumbLd, JsonLd } from "@/lib/seo";
import { PageHeader } from "@/components/content/page-header";
import { BusinessInquiryForm } from "./business-inquiry-form";
import { pageMetadata } from "@/lib/metadata";
import { getI18n } from "@/i18n/server";
import { fmtRich } from "@/components/content/rich-text";

const PATH = "/firmenkunden";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return pageMetadata({
    title: m.content.business.metaTitle,
    description: m.content.business.metaDescription,
    path: PATH,
  });
}

type Icon = React.ComponentType<LucideProps>;

/** What companies can ask for. Nothing here is a standing offer – everything is clarified per inquiry. */
const REQUESTS: { icon: Icon; key: "office" | "gifts" | "events" }[] = [
  { icon: Building2, key: "office" },
  { icon: Gift, key: "gifts" },
  { icon: CalendarDays, key: "events" },
];

const GOOD_TO_KNOW = ["delivery", "handTied", "courier", "single"] as const;

const NEXT_STEPS = ["send", "reply", "offer"] as const;

/** Settings values that still need to be filled in start with "[" (see settings.json). */
const isPlaceholder = (v: string) => v.trim().startsWith("[");

export default async function BusinessPage() {
  const [settings, { m, href }] = await Promise.all([getSettings(), getI18n()]);
  const { brand } = settings;
  const t = m.content.business;

  return (
    <article>
      <PageHeader
        eyebrow={t.title}
        title={t.headline}
        intro={t.intro}
        crumbs={[{ label: t.title }]}
        size="lg"
      />

      {/* What can be requested */}
      <section aria-labelledby="business-values-heading" className="container-x py-16 sm:py-20 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-3">{t.requestsEyebrow}</p>
            <h2 id="business-values-heading" className="display-2 max-w-md text-balance text-ink">{t.requestsTitle}</h2>
          </div>
          <ul className="grid gap-8 sm:grid-cols-3 lg:col-span-8 lg:gap-6">
            {REQUESTS.map((v) => (
              <li key={v.key} className="border-t border-line pt-6 lg:pt-7">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-ivory-100 text-forest">
                  <v.icon className="size-[18px]" strokeWidth={1.4} aria-hidden />
                </span>
                <h3 className="mt-5 font-serif text-[24px] leading-tight text-ink">{t.requests[v.key].title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">{t.requests[v.key].text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Mood image */}
      <div className="container-x pb-16 sm:pb-20 lg:pb-24">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-ivory-200 sm:aspect-[3/2] lg:aspect-[21/9]">
          <Image
            src="/images/editorial/strauss-wiener-kaffeehaus.jpg"
            alt={t.imageAlt}
            fill
            sizes="(min-width: 1440px) 1320px, 100vw"
            className="object-cover object-[60%_55%]"
          />
        </div>
      </div>

      {/* How we work */}
      <section aria-labelledby="business-facts-heading" className="border-y border-line bg-ivory-100/70">
        <div className="container-x py-16 sm:py-20 lg:py-24">
          <div className="mb-10 max-w-2xl sm:mb-14">
            <p className="eyebrow mb-3">{m.content.goodToKnow}</p>
            <h2 id="business-facts-heading" className="display-2 text-balance text-ink">{t.factsTitle}</h2>
          </div>
          <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {GOOD_TO_KNOW.map((g) => (
              <li key={g} className="border-t border-line pt-5">
                <h3 className="font-serif text-[22px] leading-tight text-ink">{t.facts[g].title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{t.facts[g].text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Inquiry */}
      <section aria-labelledby="business-form-heading" className="container-x py-16 sm:py-20 lg:py-24">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-20">
          <div className="space-y-12">
            <div>
              <p className="eyebrow mb-3">{t.stepsEyebrow}</p>
              <h2 className="display-3 text-ink">{t.stepsTitle}</h2>
              <ol className="mt-8 divide-y divide-line border-y border-line">
                {NEXT_STEPS.map((s, i) => (
                  <li key={s} className="grid grid-cols-[auto_1fr] gap-x-5 py-5">
                    <span className="font-serif text-[15px] italic tracking-[0.04em] text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="text-[15px] font-semibold text-ink">{t.steps[s].title}</p>
                      <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">{t.steps[s].text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-md bg-ivory-100 p-6 sm:p-8">
              <p className="eyebrow mb-3">{t.directEyebrow}</p>
              <p className="text-[15px] leading-relaxed text-ink-muted">
                {isPlaceholder(brand.email) ? (
                  fmtRich(t.directContactPage, { link: <a href={href(routes.contact)} className="text-forest underline underline-offset-4">{t.directContactPageLink}</a> })
                ) : (
                  fmtRich(isPlaceholder(brand.phone) ? t.directEmail : t.directEmailPhone, {
                    email: <a href={`mailto:${brand.email}`} className="text-forest underline underline-offset-4">{brand.email}</a>,
                    phone: <a href={`tel:${brand.phone.replace(/[^\d+]/g, "")}`} className="text-forest underline underline-offset-4">{brand.phone}</a>,
                  })
                )}
              </p>
            </div>
          </div>

          <div id="anfrage" className="scroll-mt-24 rounded-md border border-line bg-white/70 p-6 shadow-soft sm:p-10">
            <p className="eyebrow mb-3">{t.formEyebrow}</p>
            <h2 id="business-form-heading" className="display-3 text-ink">{t.formTitle}</h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">{t.formText}</p>
            <BusinessInquiryForm className="mt-8" />
          </div>
        </div>
      </section>

      <JsonLd data={breadcrumbLd([{ name: m.content.homeCrumb, url: "/" }, { name: t.title, url: PATH }], settings)} />
    </article>
  );
}
