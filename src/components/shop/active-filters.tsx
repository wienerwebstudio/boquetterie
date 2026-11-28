"use client";
import { dateFormatIn } from "@/i18n/format";
import { X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import type { I18n } from "@/i18n/shared";
import { filterChips, removeChip, resetFilters, type FilterChip, type FilterKey, type FilterOptions } from "@/lib/shop-filters";
import { useShopParams } from "./use-shop-params";

/** Chip text in the visitor's language; occasions (content) keep the label from `filterChips`. */
function chipLabel(chip: FilterChip, { m, fmt, locale }: I18n) {
  const dict: Partial<Record<FilterKey, Record<string, string>>> = {
    preis: m.shop.priceRanges, blume: m.shop.flowers, farbe: m.shop.colors,
    groesse: m.shop.sizes, stil: m.shop.styles, saison: m.shop.seasons,
  };
  switch (chip.key) {
    case "sameday": return m.shop.availability.sameday.label;
    case "lager": return m.shop.availability.lager.label;
    case "plz": return fmt(m.shop.filters.chipPostalCode, { plz: chip.value });
    case "datum": {
      const [y, mo, d] = chip.value.split("-").map(Number);
      const date = dateFormatIn(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, mo - 1, d, 12)));
      return fmt(m.shop.filters.chipDate, { date });
    }
    default: return dict[chip.key]?.[chip.value] ?? chip.label;
  }
}

/** Active filter chips with remove buttons and a global reset. Renders nothing when no filter is set. */
export function ActiveFilters({ options, hide = [] }: { options: FilterOptions; hide?: FilterKey[] }) {
  const { params, apply } = useShopParams();
  const i18n = useI18n();
  const { m, fmt } = i18n;
  const chips = filterChips(params, options, hide);
  if (!chips.length) return null;
  return (
    <div role="group" className="flex flex-wrap items-center gap-2 animate-fade-in" aria-label={m.shop.filters.active}>
      <ul className="contents">
        {chips.map((chip) => {
          const label = chipLabel(chip, i18n);
          return (
            <li key={`${chip.key}-${chip.value}`}>
              <button
                type="button"
                onClick={() => apply(removeChip(params, chip))}
                aria-label={fmt(m.shop.filters.remove, { label })}
                className="group inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-white pl-3 pr-2 text-[12.5px] font-medium text-ink transition-colors hover:border-forest hover:text-forest"
              >
                {label}
                <X className="size-3.5 text-ink-soft transition-colors group-hover:text-forest" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={() => apply(resetFilters(params))} className="ml-1 text-[12.5px] font-semibold text-forest underline-offset-4 hover:underline">
        {m.shop.filters.resetAll}
      </button>
    </div>
  );
}
