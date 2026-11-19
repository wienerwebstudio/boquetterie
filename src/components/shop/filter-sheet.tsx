"use client";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { countActiveFilters, resetFilters, type FilterKey, type FilterOptions, type ShopParams } from "@/lib/shop-filters";
import { FilterGroups } from "./filter-groups";
import { useShopParams } from "./use-shop-params";
import { useI18n } from "@/i18n/client";

/** Mobile: a "Filter" button that opens a bottom sheet with a draft state and an apply button. */
export function FilterSheet({ options, hide = [], resultCount }: { options: FilterOptions; hide?: FilterKey[]; resultCount?: number }) {
  const { params, apply } = useShopParams();
  const { m, fmt, plural } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ShopParams>(params);

  const active = countActiveFilters(params, hide);
  const draftActive = countActiveFilters(draft, hide);
  const dirty = JSON.stringify(draft) !== JSON.stringify(params);

  const submit = () => { apply(draft); setOpen(false); };

  return (
    <>
      <button
        type="button"
        onClick={() => { setDraft(params); setOpen(true); }}
        aria-haspopup="dialog"
        className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-white px-4 text-[13px] font-semibold text-ink transition-colors hover:border-forest"
      >
        <SlidersHorizontal className="size-4" strokeWidth={1.7} aria-hidden />
        {m.shop.filters.title}{active > 0 && <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-forest px-1.5 text-[11px] text-ivory">{active}</span>}
      </button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        side="bottom"
        title={m.shop.filters.title}
        labelledBy="filter-sheet-title"
        footer={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDraft(resetFilters(draft))}
              disabled={draftActive === 0}
              className="h-12 shrink-0 px-2 text-[13px] font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-40"
            >
              {m.shop.filters.reset}
            </button>
            <Button size="lg" full onClick={submit} disabled={!dirty && resultCount === undefined}>
              {dirty ? m.shop.filters.apply : resultCount !== undefined ? fmt(m.shop.filters.showResults, { results: plural(resultCount, m.shop.results.bouquets) }) : m.shop.filters.applyIdle}
            </Button>
          </div>
        }
      >
        <div className="px-5 pb-4 sm:px-6">
          <FilterGroups values={draft} onChange={setDraft} options={options} hide={hide} dense defaultOpen={["anlass", "preis", "farbe", "verfuegbarkeit", "lieferdatum"]} />
        </div>
      </Drawer>
    </>
  );
}
