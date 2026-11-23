import type { Metadata } from "next";
import { CalendarClock, Flower2, MapPin, Building2, type LucideProps } from "lucide-react";
import { getAllProducts, getSettings } from "@/lib/content";
import { routes } from "@/lib/urls";
import { breadcrumbLd, JsonLd } from "@/lib/seo";
import { pageMetadata } from "@/lib/metadata";
import { getLocalNow } from "@/lib/delivery";
import { PageHeader } from "@/components/content/page-header";
import { getI18n } from "@/i18n/server";
import { ClientMessages } from "@/i18n/scope";
import { isValidProductSlug } from "@/lib/custom-requests-core";
import { CustomRequestForm } from "./custom-request-form";

const PATH = routes.customRequest;

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return pageMetadata({ title: m.inquiry.metaTitle, description: m.inquiry.metaDescription, path: PATH });
}

const EXAMPLES: { icon: React.ComponentType<LucideProps>; key: "early" | "market" | "product" | "venue" }[] = [
  { icon: CalendarClock, key: "early" },
  { icon: MapPin, key: "market" },
  { icon: Flower2, key: "product" },
  { icon: Building2, key: "venue" },
];

/**
 * "Anfrage": special wishes and delivery questions (time, place, a specific bouquet).
 * `?produkt=<slug>` preselects a shop product (links from product pages). See docs/INQUIRIES.md.
 */
export default async function CustomRequestPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, settings, products, { m }] = await Promise.all([searchParams, getSettings(), getAllProducts(), getI18n()]);
  const t = m.inquiry;
  const options = products
    .filter((p) => p.active)
    .map((p) => ({ slug: p.slug, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const wanted = typeof sp.produkt === "string" ? sp.produkt.toLowerCase() : "";
  const initialProduct = isValidProductSlug(wanted) && options.some((o) => o.slug === wanted) ? wanted : "";

  return (
    <article>
      <PageHeader eyebrow={t.eyebrow} title={t.title} intro={t.intro} crumbs={[{ label: t.eyebrow }]} />

      <div className="container-x py-12 sm:py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-20">
          <aside aria-labelledby="request-examples-heading" className="lg:pt-2">
            <p id="request-examples-heading" className="eyebrow mb-4">{t.examplesTitle}</p>
            <ul className="divide-y divide-line border-y border-line">
              {EXAMPLES.map(({ icon: Icon, key }) => (
                <li key={key} className="flex items-start gap-4 py-4">
                  <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-ivory-100 text-forest">
                    <Icon className="size-4" strokeWidth={1.5} aria-hidden />
                  </span>
                  <p className="font-serif text-[19px] leading-snug text-ink">{t.examples[key]}</p>
                </li>
              ))}
            </ul>
          </aside>

          <section aria-labelledby="request-form-heading" className="rounded-md border border-line bg-white/70 p-5 shadow-soft sm:p-10">
            <h2 id="request-form-heading" className="sr-only">{t.formLabel}</h2>
            <ClientMessages ns={["inquiry"]}>
              <CustomRequestForm products={options} initialProduct={initialProduct} today={getLocalNow(settings.timezone).date} />
            </ClientMessages>
          </section>
        </div>
      </div>

      <JsonLd data={breadcrumbLd([{ name: m.content.homeCrumb, url: "/" }, { name: t.eyebrow, url: PATH }], settings)} />
    </article>
  );
}
