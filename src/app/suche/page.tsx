import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { getAllProducts, getCategories, getOccasions } from "@/lib/cms";
import { search, sortProducts } from "@/lib/catalog";
import { routes } from "@/lib/urls";
import { resultLabel } from "@/lib/shop-filters";
import { ProductGrid } from "@/components/shop/product-grid";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = ["Rosen", "Mama", "Geburtstag", "Weiß", "Danke", "Pastell", "Heute"];

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }): Promise<Metadata> {
  const q = readQuery((await searchParams).q);
  return {
    title: q ? `Suche: „${q}“` : "Suche",
    description: "Finde Sträuße nach Blume, Farbe oder Anlass – frisch gebunden und in Wien geliefert.",
    robots: { index: false, follow: true },
  };
}

function readQuery(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v ?? "").trim().slice(0, 80);
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const q = readQuery((await searchParams).q);
  const [products, occasions, categories] = await Promise.all([getAllProducts(), getOccasions(), getCategories()]);
  const result = q.length >= 2 ? search(q, products, occasions, categories, 48) : { products: [], occasions: [], categories: [] };
  const total = result.products.length + result.occasions.length + result.categories.length;
  const featured = occasions.filter((o) => o.featured).slice(0, 4);
  const bestsellers = sortProducts(products.filter((p) => p.bestseller), "bestseller").slice(0, 4);

  return (
    <div className="container-x pb-20 pt-8 sm:pt-12 lg:pb-28">
      <header className="max-w-3xl">
        <p className="eyebrow mb-3">Suche</p>
        <h1 className="display-2 text-balance text-ink">
          {q ? <>Ergebnisse für <span className="italic">„{q}“</span></> : "Wonach suchst du?"}
        </h1>
        <form action={routes.search} method="get" role="search" className="mt-6 flex max-w-xl gap-2">
          <label htmlFor="search-page-q" className="sr-only">Suchbegriff</label>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
            <input
              id="search-page-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Blume, Farbe oder Anlass"
              autoComplete="off"
              className="h-12 w-full rounded-md border border-line bg-white pl-11 pr-4 text-[15px] text-ink placeholder:text-ink-soft focus:border-forest focus:outline-none"
            />
          </div>
          <Button type="submit" size="md">Suchen</Button>
        </form>
        {q && (
          <p className="mt-4 text-[13px] text-ink-muted" aria-live="polite">
            {total > 0 ? <>{resultLabel(result.products.length)}{result.occasions.length + result.categories.length > 0 && ` · ${result.occasions.length + result.categories.length} passende Seiten`}</> : "Keine Treffer"}
          </p>
        )}
      </header>

      {(result.occasions.length > 0 || result.categories.length > 0) && (
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-moss">Passende Seiten</span>
          {result.occasions.map((o) => (
            <Link key={o.slug} href={routes.occasion(o.slug)} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white pl-1.5 pr-4 text-[13px] text-ink transition-colors hover:border-forest hover:text-forest">
              <span className="relative size-6 overflow-hidden rounded-full bg-ivory-200"><Image src={o.image} alt="" fill sizes="24px" className="object-cover" /></span>
              {o.name}
            </Link>
          ))}
          {result.categories.map((c) => (
            <Link key={c.slug} href={routes.category(c.slug)} className="inline-flex h-9 items-center rounded-full border border-line bg-white px-4 text-[13px] text-ink transition-colors hover:border-forest hover:text-forest">
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {result.products.length > 0 ? (
        <section className="mt-10 border-t border-line pt-10" aria-labelledby="search-products">
          <h2 id="search-products" className="sr-only">Sträuße</h2>
          <ProductGrid products={result.products} />
        </section>
      ) : (
        <section className="mt-10 border-t border-line pt-10">
          {q.length >= 2 && (
            <div className="max-w-xl">
              <h2 className="display-3 text-ink">Dazu haben wir noch keinen Strauß.</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">Probier es mit einer Blume, einer Farbe oder einem Anlass – oder lass dich von unseren Lieblingssträußen inspirieren.</p>
            </div>
          )}
          {q.length < 2 && (
            <p className="max-w-xl text-[15px] leading-relaxed text-ink-muted">Suche nach Blumen, Farben oder Anlässen – zum Beispiel „Rosen“, „Weiß“ oder „Mama“.</p>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            {SUGGESTIONS.filter((s) => s.toLowerCase() !== q.toLowerCase()).map((s) => (
              <Link key={s} href={`${routes.search}?q=${encodeURIComponent(s)}`} className="inline-flex h-9 items-center rounded-full border border-line bg-white px-4 text-[13px] text-ink transition-colors hover:border-forest hover:text-forest">{s}</Link>
            ))}
          </div>
          <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div>
              <p className="eyebrow mb-4">Beliebte Anlässe</p>
              <ul className="grid grid-cols-2 gap-4">
                {featured.map((o) => (
                  <li key={o.slug}>
                    <Link href={routes.occasion(o.slug)} className="group block">
                      <div className="relative aspect-[5/4] overflow-hidden rounded-md bg-ivory-200">
                        <Image src={o.image} alt={o.imageAlt} fill sizes="(min-width: 1024px) 20vw, 45vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                      </div>
                      <p className="mt-2 text-[14px] font-semibold text-ink group-hover:text-forest">{o.name}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-4 flex items-baseline justify-between">
                <p className="eyebrow">Bestseller</p>
                <Link href={routes.category("bestseller")} className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest">
                  Alle Bestseller <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </div>
              <ProductGrid products={bestsellers} className="lg:grid-cols-2 xl:grid-cols-2" priorityCount={0} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
