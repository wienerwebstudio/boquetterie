"use client";
import Link from "@/components/ui/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import type { Product } from "@/types";
import { ProductCard } from "@/components/shop/product-card";
import { routes } from "@/lib/urls";
import { useI18n } from "@/i18n/client";

export function GiftFinderResults({
  products, fallback, occasionHits, forLabel, occasion, budgetLabel, onReset,
}: {
  products: Product[];
  fallback: boolean;
  occasionHits: number;
  forLabel: string;
  occasion: { slug: string; name: string };
  budgetLabel: string;
  onReset: () => void;
}) {
  const { m, fmt, plural } = useI18n();
  const t = m.shop.giftFinder.results;
  const note = fallback
    ? t.fallback
    : occasionHits === 0
      ? fmt(t.noOccasionMatch, { occasion: occasion.name, for: forLabel })
      : null;

  return (
    <section aria-labelledby="gf-results-title">
      <div className="flex flex-col gap-5 border-t border-line pt-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow mb-3">{t.eyebrow}</p>
          <h2 id="gf-results-title" className="display-3 text-balance text-ink">
            {forLabel} · {occasion.name} · {budgetLabel}
          </h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted" role="status" aria-live="polite">
            {fmt(t.found, { results: plural(products.length, m.shop.results.bouquets) })}{note ? ` ${note}` : ""}
          </p>
        </div>
        <Link href={routes.occasion(occasion.slug)} className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-forest">
          {fmt(t.allFor, { occasion: occasion.name })}
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
        </Link>
      </div>

      <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3">
        {products.map((p, i) => (
          <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 5) * 50}ms` }}>
            <ProductCard product={p} priority={i < 3} sizesAttr="(min-width: 1440px) 420px, (min-width: 1024px) 30vw, 46vw" />
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onReset} className="inline-flex items-center gap-2 text-sm font-semibold text-forest underline-offset-4 hover:underline">
          <RotateCcw className="size-4" aria-hidden /> {t.restart}
        </button>
        <p className="text-[13px] text-ink-soft">{t.shareHint}</p>
      </div>
    </section>
  );
}
