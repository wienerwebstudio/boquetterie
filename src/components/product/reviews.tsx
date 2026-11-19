import type { Review } from "@/types";
import { StarRating } from "@/components/ui/star-rating";
import { ReviewPhotos } from "@/components/reviews/review-photos";
import { publicReviewPhotos } from "@/lib/review-submission";
import { getI18n } from "@/i18n/server";
import { LOCALE_INFO, type Locale } from "@/i18n/config";

function formatMonth(iso: string, locale: Locale) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALE_INFO[locale].intl, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/**
 * Reviews for one product. Demo entries are labelled as examples; no aggregate score is shown
 * unless it comes from real data.
 */
export async function ProductReviews({ reviews, productName }: { reviews: Review[]; productName: string }) {
  if (!reviews.length) return null;
  const { m, fmt, locale } = await getI18n();
  const t = m.product.reviews;
  const hasDemo = reviews.some((r) => r.demo);
  return (
    <section className="border-t border-line bg-ivory-100/60 py-16 lg:py-24" aria-labelledby="reviews-title">
      <div className="container-x">
        <div className="mb-8 flex flex-col gap-3 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-3">{t.eyebrow}</p>
            <h2 id="reviews-title" className="display-3 text-ink">{fmt(t.title, { name: productName })}</h2>
          </div>
          {hasDemo && <p className="text-[12.5px] text-ink-muted">{t.demoNote}</p>}
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <li key={r.id} className="flex flex-col rounded-md border border-line bg-white/70 p-6">
              <StarRating value={r.rating} />
              <p className="mt-4 flex-1 font-serif text-[19px] leading-snug text-ink">{fmt(t.quote, { text: r.text })}</p>
              <ReviewPhotos photos={publicReviewPhotos(r)} author={r.name} className="mt-4" />
              <p className="mt-5 text-[13px] text-ink-muted">
                <span className="font-semibold text-ink">{r.name}</span> · {formatMonth(r.date, locale)}
                {r.verified && !r.demo && <span className="ml-2 text-success">{t.verified}</span>}
                {r.demo && <span className="ml-2 text-ink-muted">{t.demo}</span>}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
