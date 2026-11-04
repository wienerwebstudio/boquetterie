"use client";
import { resultLabel, type FilterKey, type FilterOptions } from "@/lib/shop-filters";
import { FilterSheet } from "./filter-sheet";
import { SortSelect } from "./sort-select";
import { ActiveFilters } from "./active-filters";

/**
 * Row above the grid: result count, mobile filter button, sort select – then the
 * active filter chips. The desktop rail lives outside, in the listing layout.
 */
export function ShopToolbar({ count, options, hide = [] }: { count: number; options: FilterOptions; hide?: FilterKey[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-ink-muted" aria-live="polite">
          <span className="font-semibold text-ink tabular-nums">{resultLabel(count)}</span>
        </p>
        <div className="flex items-center gap-2">
          <div className="lg:hidden"><FilterSheet options={options} hide={hide} resultCount={count} /></div>
          <SortSelect />
        </div>
      </div>
      <ActiveFilters options={options} hide={hide} />
    </div>
  );
}
