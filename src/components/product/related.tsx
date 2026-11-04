import type { Product } from "@/types";
import { ProductCard } from "@/components/shop/product-card";
import { SectionHeading } from "@/components/ui/section";
import { routes } from "@/lib/urls";

/** Same category first, then shared occasions, then bestsellers – never the product itself. */
export function pickRelated(all: Product[], product: Product, limit = 4) {
  const others = all.filter((p) => p.active && p.slug !== product.slug);
  const score = (p: Product) =>
    (p.category === product.category ? 4 : 0) +
    p.occasions.filter((o) => product.occasions.includes(o)).length * 2 +
    p.styles.filter((s) => product.styles.includes(s)).length +
    (p.bestseller ? 1 : 0);
  return others
    .map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s || (a.p.sortOrder ?? 999) - (b.p.sortOrder ?? 999))
    .slice(0, limit)
    .map((x) => x.p);
}

export function RelatedProducts({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return (
    <section className="border-t border-line py-16 lg:py-24" aria-labelledby="related-title">
      <div className="container-x">
        <SectionHeading eyebrow="Weiter stöbern" title="Das könnte auch gefallen" link={{ label: "Alle Blumen ansehen", href: routes.shop }} />
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
          {products.map((p) => (
            <li key={p.slug}><ProductCard product={p} sizesAttr="(min-width: 1024px) 22vw, 45vw" /></li>
          ))}
        </ul>
      </div>
    </section>
  );
}
