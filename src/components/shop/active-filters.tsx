"use client";
import { X } from "lucide-react";
import { filterChips, removeChip, resetFilters, type FilterKey, type FilterOptions } from "@/lib/shop-filters";
import { useShopParams } from "./use-shop-params";

/** Active filter chips with remove buttons and a global reset. Renders nothing when no filter is set. */
export function ActiveFilters({ options, hide = [] }: { options: FilterOptions; hide?: FilterKey[] }) {
  const { params, apply } = useShopParams();
  const chips = filterChips(params, options, hide);
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 animate-fade-in" aria-label="Aktive Filter">
      <ul className="contents">
        {chips.map((chip) => (
          <li key={`${chip.key}-${chip.value}`}>
            <button
              type="button"
              onClick={() => apply(removeChip(params, chip))}
              aria-label={`Filter entfernen: ${chip.label}`}
              className="group inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-white pl-3 pr-2 text-[12.5px] font-medium text-ink transition-colors hover:border-forest hover:text-forest"
            >
              {chip.label}
              <X className="size-3.5 text-ink-soft transition-colors group-hover:text-forest" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => apply(resetFilters(params))} className="ml-1 text-[12.5px] font-semibold text-forest underline-offset-4 hover:underline">
        Filter zurücksetzen
      </button>
    </div>
  );
}
