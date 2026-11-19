"use client";
import { Search } from "lucide-react";
import { inputCls } from "@/components/admin/controls";
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_TONES } from "@/lib/outreach/format";
import type { ContactRow, RowFilter } from "@/lib/outreach/rows";
import { OUTREACH_CATEGORIES, OUTREACH_STATUSES } from "@/types/outreach";
import { cn } from "@/lib/format";

/** Status counts (clickable) and the filter row – shared by the contact list and the send composer. */
export function ContactFilters({ rows, filter, onChange, idPrefix }: { rows: ContactRow[]; filter: RowFilter; onChange: (f: RowFilter) => void; idPrefix: string }) {
  const counts = Object.fromEntries(OUTREACH_STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length]));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Nach Status filtern">
        <button
          type="button"
          onClick={() => onChange({ ...filter, status: "" })}
          aria-pressed={!filter.status}
          className={cn("rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors", !filter.status ? "border-forest bg-forest text-ivory" : "border-line bg-white text-ink hover:border-forest/50")}
        >
          Alle <span className="opacity-70">{rows.length}</span>
        </button>
        {OUTREACH_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ ...filter, status: filter.status === s ? "" : s })}
            aria-pressed={filter.status === s}
            className={cn(
              "rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors",
              filter.status === s ? "border-ink/40 ring-2 ring-forest/30" : "border-transparent",
              STATUS_TONES[s],
            )}
          >
            {STATUS_LABELS[s]} <span className="opacity-70">{counts[s]}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_180px_160px]">
        <label className="relative block">
          <span className="sr-only">Suche</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input
            id={`${idPrefix}-q`}
            type="search"
            value={filter.q}
            onChange={(e) => onChange({ ...filter, q: e.target.value })}
            placeholder="Firma, Name, E-Mail, Tag …"
            className={cn(inputCls, "pl-9")}
          />
        </label>
        <label className="block">
          <span className="sr-only">Kategorie</span>
          <select value={filter.category} onChange={(e) => onChange({ ...filter, category: e.target.value })} className={inputCls}>
            <option value="">Alle Kategorien</option>
            {OUTREACH_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Bezirk/PLZ</span>
          <input value={filter.district} onChange={(e) => onChange({ ...filter, district: e.target.value })} placeholder="Bezirk/PLZ" className={inputCls} />
        </label>
      </div>
    </div>
  );
}
