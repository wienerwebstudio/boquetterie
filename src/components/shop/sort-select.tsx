"use client";
import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { SORT_OPTIONS, type SortValue } from "@/lib/catalog";
import { useShopParams } from "./use-shop-params";

/** Native select, styled as a quiet inline control. Writes `sort` to the URL. */
export function SortSelect() {
  const { params, update } = useShopParams();
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="hidden text-[13px] text-ink-muted sm:block">Sortieren</label>
      <div className="relative">
        <select
          id={id}
          value={params.sort}
          onChange={(e) => update({ sort: e.target.value as SortValue })}
          aria-label="Sortieren"
          className="h-11 appearance-none rounded-md border border-line bg-white pl-4 pr-9 text-[13px] font-semibold text-ink transition-colors hover:border-forest focus:border-forest focus:outline-none"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
      </div>
    </div>
  );
}
