import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { HomepageContent, Occasion } from "@/types";
import { Section, SectionHeading } from "@/components/ui/section";
import { routes } from "@/lib/urls";

/**
 * "Shoppen nach Anlass" – 3x3 grid on desktop, snap-scroll row on mobile.
 */
export function OccasionGrid({ content, occasions }: { content: HomepageContent["occasions"]; occasions: Occasion[] }) {
  if (!occasions.length) return null;
  return (
    <Section id="anlaesse">
      <SectionHeading eyebrow="Shoppen nach Anlass" title={content.headline} subtitle={content.subheadline} link={{ label: "Alle Anlässe", href: routes.occasions }} />
      <ul className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 scrollbar-none sm:-mx-8 sm:px-8 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:gap-6">
        {occasions.map((o) => (
          <li key={o.slug} className="w-[72vw] shrink-0 snap-start sm:w-[46vw] md:w-auto">
            <Link href={routes.occasion(o.slug)} className="group block" aria-label={`${o.name} – Blumen ansehen`}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-ivory-200 md:aspect-[5/6]">
                <Image
                  src={o.image}
                  alt={o.imageAlt || ""}
                  fill
                  sizes="(min-width: 1440px) 430px, (min-width: 768px) 31vw, (min-width: 640px) 46vw, 72vw"
                  className="object-cover transition-transform duration-700 ease-[var(--ease-soft)] group-hover:scale-[1.04]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/5 to-transparent" aria-hidden />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                  <div className="text-ivory">
                    <p className="font-serif text-[26px] leading-none sm:text-[28px]">{o.name}</p>
                    <p className="mt-1.5 line-clamp-1 text-[12.5px] text-ivory/80">{o.headline}</p>
                  </div>
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-ivory/90 text-forest transition-all duration-300 ease-[var(--ease-soft)] group-hover:bg-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    <ArrowUpRight className="size-4" strokeWidth={1.8} aria-hidden />
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
