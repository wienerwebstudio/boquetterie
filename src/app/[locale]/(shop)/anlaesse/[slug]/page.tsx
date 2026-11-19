import type { Metadata } from "next";
import { hasQueryParams, pageMetadata } from "@/lib/metadata";
import Image from "next/image";
import Link from "@/components/ui/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getFaqs, getOccasionBySlug, getOccasions, getSettings } from "@/lib/cms";
import { routes } from "@/lib/urls";
import { JsonLd, breadcrumbLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Accordion } from "@/components/ui/accordion";
import { ShopListing, type RawSearchParams } from "@/components/shop/shop-listing";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const occasions = await getOccasions();
  return occasions.map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const { slug } = await params;
  const occasion = await getOccasionBySlug(slug);
  if (!occasion) return {};
  return pageMetadata({
    title: occasion.seo.title, description: occasion.seo.description, path: routes.occasion(occasion.slug),
    image: { url: occasion.image, alt: occasion.imageAlt },
    noindex: hasQueryParams(await searchParams),
  });
}

/** Three FAQs that fit the occasion best – trauer/gute-besserung lean on delivery questions, gifts on card & date. */
const FAQ_IDS: Record<string, string[]> = {
  trauer: ["f-where", "f-nobody", "f-anon"],
  "gute-besserung": ["f-window", "f-card", "f-business"],
  hochzeit: ["f-date", "f-window", "f-business"],
  liebe: ["f-anon", "f-card", "f-window"],
  jahrestag: ["f-date", "f-window", "f-card"],
  geburt: ["f-business", "f-card", "f-date"],
};
const DEFAULT_FAQS = ["f-date", "f-card", "f-window"];

export default async function OccasionPage({ params, searchParams }: { params: Params; searchParams: Promise<RawSearchParams> }) {
  const { slug } = await params;
  const [occasion, settings, allFaqs, sp] = await Promise.all([getOccasionBySlug(slug), getSettings(), getFaqs(), searchParams]);
  if (!occasion) notFound();

  const ids = FAQ_IDS[occasion.slug] ?? DEFAULT_FAQS;
  const faqs = ids.map((id) => allFaqs.find((f) => f.id === id)).filter((f): f is NonNullable<typeof f> => Boolean(f)).slice(0, 3);
  const pathname = routes.occasion(occasion.slug);

  return (
    <div className="pb-20 lg:pb-28">
      <JsonLd data={breadcrumbLd([{ name: "Anlässe", url: routes.occasions }, { name: occasion.name, url: pathname }], settings)} />

      {/* Hero */}
      <section className="container-x pt-6 sm:pt-8">
        <Breadcrumbs items={[{ label: "Anlässe", href: routes.occasions }, { label: occasion.name }]} />
        <div className="mt-6 grid items-center gap-8 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <div className="order-2 lg:order-1">
            <p className="eyebrow mb-3">{occasion.name}</p>
            <h1 className="display-1 text-balance text-ink animate-fade-up">{occasion.headline}</h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-muted sm:text-lg">{occasion.intro}</p>
            <a href="#straeusse" className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-forest">
              Zu den Sträußen <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </a>
          </div>
          <div className="order-1 relative aspect-[4/3] overflow-hidden rounded-md bg-ivory-200 lg:order-2 lg:aspect-[5/4]">
            <Image src={occasion.image} alt={occasion.imageAlt} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="straeusse" className="container-x mt-12 scroll-mt-28 border-t border-line pt-10 sm:mt-16 sm:pt-12" aria-labelledby="straeusse-title">
        <h2 id="straeusse-title" className="sr-only">Sträuße für {occasion.name}</h2>
        <ShopListing searchParams={sp} pathname={pathname} fixed={{ occasions: [occasion.slug] }} hide={["anlass"]} />
      </section>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="container-x mt-20 lg:mt-28" aria-labelledby="occasion-faq-title">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
            <div>
              <p className="eyebrow mb-3">Gut zu wissen</p>
              <h2 id="occasion-faq-title" className="display-3 text-balance text-ink">Häufige Fragen zu Blumen {occasionDative(occasion.slug, occasion.name)}</h2>
              <Link href={routes.faq} className="group mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest">
                Alle Fragen & Antworten <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
            <Accordion items={faqs.map((f) => ({ id: f.id, title: f.question, content: <p>{f.answer}</p> }))} />
          </div>
        </section>
      )}
    </div>
  );
}

function occasionDative(slug: string, name: string) {
  switch (slug) {
    case "geburtstag": return "zum Geburtstag";
    case "geburt": return "zur Geburt";
    case "hochzeit": return "zur Hochzeit";
    case "jahrestag": return "zum Jahrestag";
    case "trauer": return "zur Trauer";
    case "danke": return "zum Danke sagen";
    case "einfach-so": return "einfach so";
    case "liebe": return "für die Liebe";
    case "gute-besserung": return "zur Genesung";
    default: return `für ${name}`;
  }
}
