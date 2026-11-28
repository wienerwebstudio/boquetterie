"use client";
import { cn } from "@/lib/format";
import { countActiveFilters, resetFilters, type FilterKey, type FilterOptions } from "@/lib/shop-filters";
import { FilterGroups } from "./filter-groups";
import { useShopParams } from "./use-shop-params";
import { useI18n } from "@/i18n/client";

/** Desktop: sticky left rail. Every change is pushed to the URL immediately. */
export function FilterRail({ options, hide = [], className }: { options: FilterOptions; hide?: FilterKey[]; className?: string }) {
  const { params, apply, pending } = useShopParams();
  const { m } = useI18n();
  const active = countActiveFilters(params, hide);
  return (
    <aside aria-label={m.shop.filters.title} aria-busy={pending} className={cn("transition-opacity duration-300", pending && "opacity-60", className)}>
      <div className="flex items-baseline justify-between border-b border-line pb-3">
        <h2 className="font-serif text-2xl text-ink">{m.shop.filters.title}</h2>
        {active > 0 && (
          <button type="button" onClick={() => apply(resetFilters(params))} className="text-[12px] font-semibold text-forest underline-offset-4 hover:underline">
            {m.shop.filters.reset}
          </button>
        )}
      </div>
      <FilterGroups values={params} onChange={apply} options={options} hide={hide} />
    </aside>
  );
}
