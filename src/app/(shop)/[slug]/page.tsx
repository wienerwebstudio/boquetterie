import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock } from "lucide-react";
import { getAllProducts, getCategories, getFaqsByIds, getLandingPageBySlug, getLandingPages, getSettings } from "@/lib/cms";
import { applyFilter, sortProducts } from "@/lib/catalog";
import { routes } from "@/lib/urls";
import { JsonLd, breadcrumbLd, faqLd } from "@/lib/seo";
import { cn } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { PostalCodeCheck } from "@/components/shop/postal-code-check";
import { ProductGrid } from "@/components/shop/product-grid";

type Params = Promise<{ slug: string }>;

/**
 * SEO landing pages from content/landing-pages.json (e.g. /blumenversand-wien).
 * Only those slugs resolve here – everything else is a 404. Real static routes
 * (/lieferung, /faq, …) take precedence over this dynamic segment.
 */
export async function generateStaticParams() {
  const pages = await getLandingPages();
  return pages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getLandingPageBySlug(slug);
  if (!page) return {};
  return {
    title: page.seo.title,
    description: page.seo.description,
    alternates: { canonical: `/${page.slug}` },
    ...(page.image && { openGraph: { images: [{ url: page.image }] } }),
  };
}

export default async function LandingPage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await getLandingPageBySlug(slug);
  if (!page) notFound();

  const [settings, products, categories, faqs] = await Promise.all([getSettings(), getAllProducts(), getCategories(), getFaqsByIds(page.faqIds)]);
  const f = page.productFilter;
  const list = sortProducts(
    applyFilter(products, { occasions: f.occasions, category: f.category, sameDayOnly: f.sameDayOnly }, categories),
    f.sameDayOnly ? "bestseller" : "recommended",
  ).slice(0, f.limit ?? 8);

  const shopHref = f.category ? routes.category(f.category)
    : f.occasions?.length === 1 ? routes.occasion(f.occasions[0])
    : f.sameDayOnly ? `${routes.shop}?sameday=1` : routes.shop;

  return (
    <div className="pb-20 lg:pb-28">
      <JsonLd data={breadcrumbLd([{ name: page.title, url: `/${page.slug}` }], settings)} />
      {faqs.length > 0 && <JsonLd data={faqLd(faqs)} />}

      {/* Hero */}
      <section className="container-x pt-6 sm:pt-8">
        <Breadcrumbs items={[{ label: page.title }]} />
        <div className={cn("mt-6 grid items-center gap-8 sm:mt-8", page.image && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16")}>
          <div className={cn("order-2 lg:order-1", !page.image && "max-w-3xl")}>
            <p className="eyebrow mb-3">{page.title}</p>
            <h1 className="display-1 text-balance text-ink animate-fade-up">{page.headline}</h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-muted sm:text-lg">{page.intro}</p>
            <div className="mt-8 max-w-md">
              <PostalCodeCheck variant="inline" title="Wohin dürfen wir liefern?" />
            </div>
          </div>
          {page.image && (
            <div className="order-1 relative aspect-[4/3] overflow-hidden rounded-md bg-ivory-200 lg:order-2 lg:aspect-[5/4]">
              <Image src={page.image} alt="" fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
            </div>
          )}
        </div>
      </section>

      {/* Products */}
      {list.length > 0 && (
        <section className="container-x mt-14 border-t border-line pt-10 sm:mt-20 sm:pt-12" aria-labelledby="landing-products">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow mb-3">Sträuße</p>
              <h2 id="landing-products" className="display-3 text-ink">{f.sameDayOnly ? "Sträuße, die wir heute binden können" : "Unsere Auswahl"}</h2>
              {f.sameDayOnly && (
                <p className="mt-3 flex max-w-xl items-start gap-2 text-[14px] leading-relaxed text-ink-muted">
                  <Clock className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden />
                  <span>Ob die Lieferung heute klappt, hängt von Postleitzahl und Uhrzeit ab. Nach der Lieferprüfung siehst du die genaue Bestellfrist für dein Gebiet.</span>
                </p>
              )}
            </div>
            <Link href={shopHref} className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-forest">
              Alle ansehen <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
          <ProductGrid products={list} showSameDay={Boolean(f.sameDayOnly)} />
        </section>
      )}

      {/* Rich sections */}
      {page.sections.length > 0 && (
        <section className="container-x mt-20 lg:mt-28">
          <div className="mx-auto flex max-w-3xl flex-col gap-14 lg:gap-20">
            {page.sections.map((s, i) => (
              <Reveal key={i} as="div" className={cn("grid gap-6", s.image && "md:grid-cols-2 md:items-center md:gap-12")}>
                <div className={cn(s.image && i % 2 === 1 && "md:order-2")}>
                  {s.heading && <h2 className="display-3 text-balance text-ink">{s.heading}</h2>}
                  <div className="mt-4 flex flex-col gap-4 text-[15px] leading-relaxed text-ink-muted sm:text-base">
                    {s.paragraphs.map((p, j) => <p key={j}>{p}</p>)}
                  </div>
                  {s.placeholder && <p className="mt-3 text-[12px] italic text-warn">[Inhalt folgt]</p>}
                </div>
                {s.image && (
                  <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-ivory-200">
                    <Image src={s.image.src} alt={s.image.alt} fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
                  </div>
                )}
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="container-x mt-20 lg:mt-28" aria-labelledby="landing-faq">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
            <div>
              <p className="eyebrow mb-3">Gut zu wissen</p>
              <h2 id="landing-faq" className="display-3 text-balance text-ink">Häufige Fragen</h2>
              <Link href={routes.faq} className="group mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest">
                Alle Fragen & Antworten <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
            <Accordion items={faqs.map((q) => ({ id: q.id, title: q.question, content: <p>{q.answer}</p> }))} />
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="container-x mt-20 lg:mt-28">
        <div className="flex flex-col items-start gap-5 rounded-lg bg-forest px-6 py-10 text-ivory sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-14 lg:py-14">
          <div>
            <p className="eyebrow text-sand">Bereit?</p>
            <p className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">Strauß wählen, Datum bestimmen, Freude schicken.</p>
          </div>
          <Button href={shopHref} variant="light" size="lg" iconRight={<ArrowRight className="size-4" aria-hidden />}>Blumen entdecken</Button>
        </div>
      </section>
    </div>
  );
}
