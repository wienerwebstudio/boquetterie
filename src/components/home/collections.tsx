import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Category, HomepageContent } from "@/types";
import { routes } from "@/lib/urls";

/**
 * "Finde deinen perfekten Strauß" – a calm row of image chips linking to collections.
 */
export function Collections({ content, categories }: { content: HomepageContent["collections"]; categories: Category[] }) {
  if (!categories.length) return null;
  return (
    <section aria-labelledby="collections-title" className="border-y border-line bg-ivory-100/60 py-14 sm:py-16 lg:py-20">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-3">Kollektionen</p>
          <h2 id="collections-title" className="display-2 text-balance text-ink">{content.headline}</h2>
          <p className="mt-3 text-[15px] text-ink-muted sm:text-base">{content.subheadline}</p>
        </div>
        <ul className="mt-9 flex flex-wrap justify-center gap-2.5 sm:mt-11 sm:gap-3">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={routes.category(c.slug)}
                className="group inline-flex items-center gap-3 rounded-full border border-line bg-white py-1.5 pl-1.5 pr-4 text-[14px] font-medium text-ink shadow-[0_1px_0_rgba(35,35,31,0.02)] transition-all duration-300 ease-[var(--ease-soft)] hover:border-forest hover:text-forest sm:pr-5 sm:text-[14.5px]"
              >
                <span className="relative size-9 overflow-hidden rounded-full bg-ivory-200 sm:size-10">
                  {c.image ? (
                    <Image src={c.image} alt="" fill sizes="48px" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <span className="absolute inset-0 bg-sand" aria-hidden />
                  )}
                </span>
                {c.name}
                <ArrowRight className="-ml-0.5 size-3.5 text-ink-soft transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-forest" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
