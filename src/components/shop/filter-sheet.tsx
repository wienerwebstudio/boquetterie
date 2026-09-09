"use client";
import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { countActiveFilters, resetFilters, type FilterKey, type FilterOptions, type ShopParams } from "@/lib/shop-filters";
import { FilterGroups } from "./filter-groups";
import { useShopParams } from "./use-shop-params";

/** Mobile: a "Filter" button that opens a bottom sheet with a draft state and an apply button. */
export function FilterSheet({ options, hide = [], resultCount }: { options: FilterOptions; hide?: FilterKey[]; resultCount?: number }) {
  const { params, apply } = useShopParams();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ShopParams>(params);
  useEffect(() => { if (!open) setDraft(params); }, [params, open]);

  const active = countActiveFilters(params, hide);
  const draftActive = countActiveFilters(draft, hide);
  const dirty = JSON.stringify(draft) !== JSON.stringify(params);

  const submit = () => { apply(draft); setOpen(false); };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-white px-4 text-[13px] font-semibold text-ink transition-colors hover:border-forest"
      >
        <SlidersHorizontal className="size-4" strokeWidth={1.7} aria-hidden />
        Filter{active > 0 && <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-forest px-1.5 text-[11px] text-ivory">{active}</span>}
      </button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        side="bottom"
        title="Filter"
        labelledBy="filter-sheet-title"
        className="max-h-[92dvh]"
        footer={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDraft(resetFilters(draft))}
              disabled={draftActive === 0}
              className="h-12 shrink-0 px-2 text-[13px] font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-40"
            >
              Zurücksetzen
            </button>
            <Button size="lg" full onClick={submit} disabled={!dirty && resultCount === undefined}>
              {dirty ? "Filter anwenden" : resultCount !== undefined ? `${resultCount === 1 ? "1 Strauß" : `${resultCount} Sträuße`} anzeigen` : "Anwenden"}
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
