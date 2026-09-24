import type { Review } from "@/types";
import { StarRating } from "@/components/ui/star-rating";

const monthYear = new Intl.DateTimeFormat("de-AT", { month: "long", year: "numeric", timeZone: "UTC" });
function formatMonth(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return monthYear.format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/**
 * Reviews for one product. Demo entries are labelled as examples; no aggregate score is shown
 * unless it comes from real data.
 */
export function ProductReviews({ reviews, productName }: { reviews: Review[]; productName: string }) {
  if (!reviews.length) return null;
  const hasDemo = reviews.some((r) => r.demo);
  return (
    <section className="border-t border-line bg-ivory-100/60 py-16 lg:py-24" aria-labelledby="reviews-title">
      <div className="container-x">
        <div className="mb-8 flex flex-col gap-3 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-3">Stimmen</p>
            <h2 id="reviews-title" className="display-3 text-ink">Bewertungen zu {productName}</h2>
          </div>
          {hasDemo && <p className="text-[12.5px] text-ink-muted">Beispielbewertungen – echte Bewertungen folgen</p>}
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <li key={r.id} className="flex flex-col rounded-md border border-line bg-white/70 p-6">
              <StarRating value={r.rating} />
              <p className="mt-4 flex-1 font-serif text-[19px] leading-snug text-ink">„{r.text}“</p>
              <p className="mt-5 text-[13px] text-ink-muted">
                <span className="font-semibold text-ink">{r.name}</span> · {formatMonth(r.date)}
                {r.verified && !r.demo && <span className="ml-2 text-success">Verifizierter Kauf</span>}
                {r.demo && <span className="ml-2 text-ink-muted">Beispiel</span>}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
