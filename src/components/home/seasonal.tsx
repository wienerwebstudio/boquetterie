import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HomepageContent, Product } from "@/types";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { primaryImage, lowestPrice } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { routes } from "@/lib/urls";

export function Seasonal({ content, products }: { content: HomepageContent["seasonal"]; products: Product[] }) {
  return (
    <Section id="saisonal" tone="ivory-100">
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
        <Reveal className="lg:col-span-6">
          <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-ivory-200 sm:aspect-[5/6] lg:aspect-[4/5]">
            <Image src={content.image} alt={content.imageAlt} fill sizes="(min-width: 1440px) 640px, (min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
        </Reveal>
        <div className="lg:col-span-6 lg:pl-4 xl:pl-10">
          <p className="eyebrow mb-3">{content.eyebrow}</p>
          <h2 className="display-2 text-balance text-ink">{content.headline}</h2>
          <p className="mt-4 max-w-lg text-pretty text-[15.5px] leading-relaxed text-ink-muted sm:text-base">{content.text}</p>
          {products.length > 0 && (
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {products.map((p) => {
                const img = primaryImage(p);
                return (
                  <li key={p.id}>
                    <Link href={routes.product(p.slug)} className="group flex items-center gap-4 py-4 sm:gap-5">
                      <span className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-ivory-200 sm:size-[72px]">
                        <Image src={img.src} alt={img.alt} fill sizes="80px" className="object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-serif text-[21px] leading-tight text-ink transition-colors group-hover:text-forest">{p.name}</span>
                        <span className="mt-0.5 line-clamp-1 block text-[13.5px] text-ink-muted">{p.tagline}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[12px] text-ink-muted">ab</span>
                        <span className="block text-[15px] font-semibold tabular-nums text-ink">{formatPrice(lowestPrice(p))}</span>
                      </span>
                      <ArrowRight className="hidden size-4 shrink-0 text-ink-soft transition-all duration-300 group-hover:translate-x-1 group-hover:text-forest sm:block" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-8">
            <Button href={content.cta.href} variant="outline" size="lg">{content.cta.label}</Button>
          </div>
        </div>
      </div>
    </Section>
  );
}
