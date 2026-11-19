import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Image from "next/image";
import Link from "@/components/ui/link";
import { ArrowRight } from "lucide-react";
import { getOccasions, getSettings } from "@/lib/cms";
import { routes } from "@/lib/urls";
import { JsonLd, breadcrumbLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return pageMetadata({
    title: m.shop.occasions.metaTitle,
    description: m.shop.occasions.metaDescription,
    path: routes.occasions,
  });
}

export default async function OccasionsPage() {
  const [occasions, settings, { m }] = await Promise.all([getOccasions(), getSettings(), getI18n()]);
  const t = m.shop.occasions;
  return (
    <div className="container-x pb-20 pt-6 sm:pt-8 lg:pb-28">
      <JsonLd data={breadcrumbLd([{ name: m.shop.breadcrumbs.occasions, url: routes.occasions }], settings)} />
      <Breadcrumbs items={[{ label: m.shop.breadcrumbs.occasions }]} />
      <header className="mt-8 max-w-3xl sm:mt-12">
        <p className="eyebrow mb-3">{t.eyebrow}</p>
        <h1 className="display-1 text-balance text-ink animate-fade-up">{t.title}</h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-muted sm:text-lg">
          {t.intro}
        </p>
      </header>

      <ul className="mt-12 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 sm:gap-y-12 lg:mt-16 lg:grid-cols-3 lg:gap-x-8">
        {occasions.map((o, i) => (
          <Reveal as="li" key={o.slug} delay={(i % 3) * 80}>
            <Link href={routes.occasion(o.slug)} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-ivory-200 sm:aspect-[4/5]">
                <Image
                  src={o.image}
                  alt={o.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
                  priority={i < 3}
                  className="object-cover transition-transform duration-700 ease-[var(--ease-soft)] group-hover:scale-[1.04]"
                />
              </div>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-serif text-[26px] leading-tight text-ink transition-colors group-hover:text-forest sm:text-[28px]">{o.name}</h2>
                  <p className="mt-1.5 line-clamp-2 max-w-md text-[14px] leading-relaxed text-ink-muted">{o.intro}</p>
                </div>
                <span className="mt-2 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-forest transition-all group-hover:border-forest group-hover:bg-forest group-hover:text-ivory" aria-hidden>
                  <ArrowRight className="size-4" />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>

      <div className="mt-16 flex flex-col items-start gap-4 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between lg:mt-24">
        <div>
          <h2 className="display-3 text-ink">{t.noMatchTitle}</h2>
          <p className="mt-2 text-[15px] text-ink-muted">{t.noMatchText}</p>
        </div>
        <Button href={routes.shop} variant="outline" size="lg" iconRight={<ArrowRight className="size-4" aria-hidden />}>{t.allFlowers}</Button>
      </div>
    </div>
  );
}
