import { Check } from "lucide-react";
import type { HomepageContent, Review } from "@/types";
import { Section, SectionHeading } from "@/components/ui/section";
import { StarRating } from "@/components/ui/star-rating";
import { ReviewPhotos } from "@/components/reviews/review-photos";
import { ReviewVideo } from "@/components/reviews/review-video";
import { ReviewLanguageNote } from "@/components/reviews/review-language";
import { ReviewRow, ReviewTextBox } from "@/components/home/review-carousel";
import { publicReviewPhotos } from "@/lib/review-submission";
import { publicReviewVideo } from "@/lib/review-video";
import { getI18n } from "@/i18n/server";

/**
 * All reviews in one horizontal row (newest first). Every tile has the same compact
 * height; a long text scrolls inside its tile while stars, media and the author line
 * stay in place.
 */
export async function Reviews({ content, reviews }: { content: HomepageContent["reviews"]; reviews: Review[] }) {
  if (!reviews.length) return null;
  const { m, fmt, dateShort } = await getI18n();
  const t = m.home.reviews;
  const hasDemo = reviews.some((r) => r.demo);
  return (
    <Section id="bewertungen">
      <ReviewRow
        header={<SectionHeading eyebrow={t.eyebrow} title={content.headline} subtitle={content.subheadline} className="mb-0! sm:mb-0!" />}
        label={t.listLabel}
        previousLabel={t.previous}
        nextLabel={t.next}
      >
        {reviews.map((r) => {
          const photos = publicReviewPhotos(r);
          const video = publicReviewVideo(r);
          return (
            <li key={r.id} data-review-tile className="h-[25rem] w-[82vw] shrink-0 snap-start sm:w-[54vw] md:w-[360px]">
              <figure className="flex h-full flex-col rounded-md bg-white p-6 shadow-soft">
                <StarRating value={r.rating} />
                <ReviewTextBox label={fmt(t.textLabel, { name: r.name })} className="-mx-1 mt-4 flex-1 px-1">
                  <blockquote>
                    <p className="font-serif text-[20px] leading-snug text-ink sm:text-[21px]">{fmt(t.quote, { text: r.text })}</p>
                  </blockquote>
                  <ReviewLanguageNote review={r} className="mt-3" />
                </ReviewTextBox>
                {(photos.length > 0 || video) && (
                  <div className="mt-4 flex shrink-0 flex-wrap items-start gap-3">
                    <ReviewPhotos photos={photos} author={r.name} />
                    <ReviewVideo video={video} author={r.name} compact />
                  </div>
                )}
                <figcaption className="mt-5 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-4">
                  <div>
                    <p className="text-[14px] font-semibold text-ink">{r.name}</p>
                    <p className="text-[12px] text-ink-soft"><time dateTime={r.date}>{dateShort(r.date)}</time></p>
                  </div>
                  {r.verified && (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-success">
                      <span className="inline-flex size-4 items-center justify-center rounded-full bg-success text-ivory"><Check className="size-2.5" strokeWidth={3} aria-hidden /></span>
                      {t.verifiedPurchase}
                    </span>
                  )}
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ReviewRow>
      {hasDemo && (
        <p className="mt-6 text-[12.5px] text-ink-soft">{t.demoNote}</p>
      )}
    </Section>
  );
}
