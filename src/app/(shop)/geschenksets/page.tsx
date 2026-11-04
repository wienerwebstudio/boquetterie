import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Info } from "lucide-react";
import { getAllProducts, getExtras, getSettings } from "@/lib/cms";
import { JsonLd, breadcrumbLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/product-card";
import { formatPrice } from "@/lib/format";
import { routes } from "@/lib/urls";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Geschenksets & Extras",
  description: "Kleine Extras, die den Moment größer machen: Premium-Grußkarte, Vase, Pralinen, Duftkerze und mehr – zu jedem Strauß hinzufügbar.",
  alternates: { canonical: routes.extras },
};

export default async function ExtrasPage() {
  const [settings, extras, products] = await Promise.all([getSettings(), getExtras(), getAllProducts()]);
  const suggestions = products.filter((p) => p.bestseller).slice(0, 3);

  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Geschenksets & Extras", url: routes.extras }], settings)} />

      <section className="container-x pt-6 sm:pt-8">
        <Breadcrumbs items={[{ label: "Geschenksets & Extras" }]} />
        <div className="grid gap-6 py-10 sm:py-14 lg:grid-cols-12 lg:gap-12 lg:py-16">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-4">Geschenksets & Extras</p>
            <h1 className="display-1 max-w-[14ch] text-balance text-ink">Mach deine Überraschung komplett.</h1>
          </div>
          <div className="lg:col-span-5 lg:self-end">
            <p className="max-w-md text-pretty text-[16px] leading-relaxed text-ink-muted sm:text-[17px]">
              Kleine Extras, die den Moment größer machen. Jedes Extra wird zusammen mit deinem Strauß verpackt und geliefert.
            </p>
            <p className="mt-4 inline-flex items-start gap-2 rounded-md bg-ivory-100 px-4 py-3 text-[13.5px] leading-snug text-ink-muted">
              <Info className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden />
              <span>Extras gibt es nicht einzeln – du fügst sie auf der Produktseite oder im Warenkorb zu einem Strauß hinzu.</span>
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="extras-title" className="container-x pb-16 sm:pb-20 lg:pb-28">
        <h2 id="extras-title" className="sr-only">Alle Extras</h2>
        {extras.length === 0 ? (
          <p className="text-[15px] text-ink-muted">Derzeit sind keine Extras verfügbar.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {extras.map((x) => (
              <li key={x.id}>
                <article className="group flex h-full flex-col" aria-labelledby={`extra-${x.id}`}>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-ivory-200 sm:aspect-square">
                    <Image src={x.image} alt={x.imageAlt} fill sizes="(min-width: 1440px) 320px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 90vw" className="object-cover transition-transform duration-700 ease-[var(--ease-soft)] group-hover:scale-[1.04]" />
                  </div>
                  <div className="mt-4 flex flex-1 flex-col">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 id={`extra-${x.id}`} className="font-serif text-[24px] leading-tight text-ink">{x.name}</h3>
                      <p className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">{formatPrice(x.price)}</p>
                    </div>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">{x.description}</p>
                    <p className="mt-3 text-[12px] leading-snug text-ink-soft">Im Warenkorb oder auf der Produktseite hinzufügbar</p>
                    <div className="mt-4">
                      <Button href={routes.shop} variant="outline" size="sm" iconRight={<ArrowRight className="size-3.5" aria-hidden />}>Strauß wählen</Button>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      {suggestions.length > 0 && (
        <section aria-labelledby="suggestions-title" className="border-t border-line bg-ivory-100 py-16 sm:py-20 lg:py-24">
          <div className="container-x">
            <div className="mb-10 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow mb-3">Passend dazu</p>
                <h2 id="suggestions-title" className="display-2 text-balance text-ink">Sträuße, zu denen Extras besonders gut passen.</h2>
              </div>
              <Link href={routes.category("bestseller")} className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-forest">
                Alle Bestseller
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
            <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} sizesAttr="(min-width: 1440px) 430px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 90vw" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
