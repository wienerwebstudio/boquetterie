import Link from "@/components/ui/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GIFT_FINDER_PATH } from "@/components/giftfinder/config";
import { getI18n } from "@/i18n/server";

const CHIPS = [
  { index: "01", key: "stepRecipient" },
  { index: "02", key: "stepOccasion" },
  { index: "03", key: "stepBudget" },
] as const;

/**
 * Compact entry to the gift finder – a tonal band between the occasion grid and
 * the bestsellers. Bottom margin replaces the top padding the following section
 * (Bestsellers, `pt-0`) leaves out.
 */
export async function GiftFinderEntry() {
  const { m } = await getI18n();
  const t = m.home.giftFinder;
  return (
    <section aria-labelledby="gift-finder-entry-title" className="bg-peach">
      <div className="container-x py-10 sm:py-12">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-3">{t.eyebrow}</p>
            <h2 id="gift-finder-entry-title" className="display-3 text-balance text-ink">{t.title}</h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">{t.text}</p>
          </div>
          <div className="flex flex-col gap-6 lg:col-span-7 lg:flex-row lg:items-center lg:justify-end lg:gap-8">
            <ol className="flex flex-wrap gap-2.5" aria-label={t.stepsLabel}>
              {CHIPS.map((c) => (
                <li key={c.index}>
                  <Link
                    href={GIFT_FINDER_PATH}
                    className="inline-flex h-11 items-center gap-2.5 rounded-full border border-peach-700/15 bg-white pl-4 pr-5 text-[14px] text-ink transition-colors duration-300 hover:border-forest hover:text-forest"
                  >
                    <span className="font-serif text-[13px] italic text-peach-700" aria-hidden>{c.index}</span>
                    {t[c.key]}
                  </Link>
                </li>
              ))}
            </ol>
            <Button href={GIFT_FINDER_PATH} size="lg" iconRight={<ArrowRight className="size-4" aria-hidden />}>
              {t.cta}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
