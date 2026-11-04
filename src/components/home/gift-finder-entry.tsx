import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GIFT_FINDER_PATH } from "@/components/giftfinder/config";

const CHIPS = [
  { index: "01", label: "Für wen?" },
  { index: "02", label: "Anlass" },
  { index: "03", label: "Budget" },
];

/**
 * Compact entry to the gift finder – a tonal band between the occasion grid and
 * the bestsellers. Bottom margin replaces the top padding the following section
 * (Bestsellers, `pt-0`) leaves out.
 */
export function GiftFinderEntry() {
  return (
    <section aria-labelledby="gift-finder-entry-title" className="mb-16 border-y border-line bg-ivory-100/70 sm:mb-20 lg:mb-28">
      <div className="container-x py-10 sm:py-12">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-3">Geschenk-Finder</p>
            <h2 id="gift-finder-entry-title" className="display-3 text-balance text-ink">Heute an jemanden gedacht?</h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">Drei kurze Fragen – und wir zeigen dir Sträuße, die passen.</p>
          </div>
          <div className="flex flex-col gap-6 lg:col-span-7 lg:flex-row lg:items-center lg:justify-end lg:gap-8">
            <ol className="flex flex-wrap gap-2.5" aria-label="Die drei Fragen">
              {CHIPS.map((c) => (
                <li key={c.index}>
                  <Link
                    href={GIFT_FINDER_PATH}
                    className="inline-flex h-11 items-center gap-2.5 rounded-full border border-line bg-white/70 pl-4 pr-5 text-[14px] text-ink transition-colors duration-300 hover:border-forest hover:text-forest"
                  >
                    <span className="font-serif text-[13px] italic text-ink-soft" aria-hidden>{c.index}</span>
                    {c.label}
                  </Link>
                </li>
              ))}
            </ol>
            <Button href={GIFT_FINDER_PATH} size="lg" iconRight={<ArrowRight className="size-4" aria-hidden />}>
              Geschenk finden
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
