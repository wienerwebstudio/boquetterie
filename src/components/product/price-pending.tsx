import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/urls";
import { useI18n } from "@/i18n/client";

/**
 * Replaces the configurator while a product's prices are not fixed yet
 * (`product.pricePending`). Shows what the product is, which sizes exist and
 * that it can't be ordered yet – the order API refuses it as well.
 */
export function PricePendingPanel({ product }: { product: Product }) {
  const { m } = useI18n();
  const t = m.product.pricePending;
  const sizes = product.sizes.map((s) => s.label);
  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="eyebrow mb-3">{product.tagline}</p>
        <h1 className="display-2 text-ink">{product.name}</h1>
        <p className="mt-3 text-[15px] text-ink-muted">{t.status}</p>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">{product.shortDescription}</p>
      </header>

      {sizes.length > 1 && (
        <div>
          <p className="mb-3 text-[14px] font-semibold text-ink">{t.sizes}</p>
          <ul className="flex flex-wrap gap-2" aria-label={t.sizesLabel}>
            {sizes.map((label) => (
              <li key={label} className="rounded-md border border-line bg-white/60 px-3.5 py-2 text-[14px] text-ink">{label}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-md border border-line bg-ivory-100 p-5">
        <p className="text-[15px] font-semibold text-ink">{t.soonTitle}</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">
          {t.soonText}
        </p>
        <Button href={routes.contact} variant="outline" size="lg" className="mt-4">{t.contact}</Button>
      </div>
    </div>
  );
}
