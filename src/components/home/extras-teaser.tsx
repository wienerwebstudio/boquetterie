import Image from "next/image";
import Link from "next/link";
import type { Extra, HomepageContent } from "@/types";
import { Section, SectionHeading } from "@/components/ui/section";
import { formatPrice } from "@/lib/format";
import { routes } from "@/lib/urls";

export function ExtrasTeaser({ content, extras }: { content: HomepageContent["extras"]; extras: Extra[] }) {
  if (!extras.length) return null;
  return (
    <Section id="extras" tone="ivory-100" className="py-14 sm:py-16 lg:py-24">
      <SectionHeading eyebrow="Geschenksets & Extras" title={content.headline} subtitle={content.subheadline} link={{ label: "Alle Extras", href: routes.extras }} />
      <ul className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 scrollbar-none sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-6 lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0">
        {extras.map((x) => (
          <li key={x.id} className="w-[46vw] shrink-0 snap-start sm:w-[30vw] lg:w-auto">
            <Link href={routes.extras} className="group block">
              <div className="relative aspect-square overflow-hidden rounded-md bg-white">
                <Image src={x.image} alt={x.imageAlt} fill sizes="(min-width: 1440px) 210px, (min-width: 1024px) 15vw, (min-width: 640px) 30vw, 46vw" className="object-cover transition-transform duration-700 ease-[var(--ease-soft)] group-hover:scale-[1.04]" />
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-2">
                <p className="font-serif text-[19px] leading-tight text-ink transition-colors group-hover:text-forest">{x.name}</p>
                <p className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">{formatPrice(x.price)}</p>
              </div>
              <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-ink-muted">{x.description}</p>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-[13px] text-ink-soft">Extras werden zu einem Strauß hinzugefügt – auf der Produktseite oder im Warenkorb.</p>
    </Section>
  );
}
