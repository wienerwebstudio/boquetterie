import { Check } from "lucide-react";
import type { HomepageContent, Review } from "@/types";
import { Section, SectionHeading } from "@/components/ui/section";
import { StarRating } from "@/components/ui/star-rating";
import { formatDateShort } from "@/lib/format";

export function Reviews({ content, reviews }: { content: HomepageContent["reviews"]; reviews: Review[] }) {
  if (!reviews.length) return null;
  const hasDemo = reviews.some((r) => r.demo);
  return (
    <Section id="bewertungen">
      <SectionHeading eyebrow="Kundenstimmen" title={content.headline} subtitle={content.subheadline} />
      <ul tabIndex={0} aria-label="Bewertungen" className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 scrollbar-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest sm:-mx-8 sm:px-8 md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
        {reviews.map((r) => (
          <li key={r.id} className="w-[82vw] shrink-0 snap-start sm:w-[54vw] md:w-auto">
            <figure className="flex h-full flex-col rounded-md bg-white p-6 shadow-soft sm:p-7">
              <StarRating value={r.rating} />
              <blockquote className="mt-4 flex-1">
                <p className="font-serif text-[20px] leading-snug text-ink sm:text-[21px]">„{r.text}“</p>
              </blockquote>
              <figcaption className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-4">
                <div>
                  <p className="text-[14px] font-semibold text-ink">{r.name}</p>
                  <p className="text-[12px] text-ink-soft">{formatDateShort(r.date)}</p>
                </div>
                {r.verified && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-success">
                    <span className="inline-flex size-4 items-center justify-center rounded-full bg-success text-ivory"><Check className="size-2.5" strokeWidth={3} aria-hidden /></span>
                    Verifizierter Kauf
                  </span>
                )}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
      {hasDemo && (
        <p className="mt-6 text-[12.5px] text-ink-soft">Beispielbewertungen – echte Bewertungen folgen.</p>
      )}
    </Section>
  );
}
