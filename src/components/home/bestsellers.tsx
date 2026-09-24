import type { HomepageContent, Product } from "@/types";
import { Section, SectionHeading } from "@/components/ui/section";
import { ProductCard } from "@/components/shop/product-card";
import { routes } from "@/lib/urls";

export function Bestsellers({ content, products, showSameDay = false }: { content: HomepageContent["bestsellers"]; products: Product[]; showSameDay?: boolean }) {
  if (!products.length) return null;
  return (
    <Section id="bestseller" className="pt-0 sm:pt-0 lg:pt-0">
      <SectionHeading eyebrow="Bestseller" title={content.headline} subtitle={content.subheadline} link={{ label: "Alle Bestseller", href: routes.category("bestseller") }} />
      <ul className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 scrollbar-none sm:-mx-8 sm:px-8 md:mx-0 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-10 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4">
        {products.map((p) => (
          <li key={p.id} className="w-[78vw] shrink-0 snap-start sm:w-[46vw] md:w-auto">
            <ProductCard product={p} showSameDay={showSameDay} sizesAttr="(min-width: 1440px) 320px, (min-width: 1024px) 23vw, (min-width: 768px) 46vw, 78vw" />
          </li>
        ))}
      </ul>
    </Section>
  );
}
