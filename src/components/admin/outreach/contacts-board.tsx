"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { EmptyState, Table, Td, Th } from "@/components/admin/controls";
import { CATEGORY_LABELS } from "@/lib/outreach/format";
import { EMPTY_FILTER, filterRows, type ContactRow } from "@/lib/outreach/rows";
import { formatDateShort } from "@/lib/format";
import { ContactFilters } from "./contact-filters";
import { OutreachStatusBadge, TrackingChips, UnsubscribedChip, btnPrimary, TRACKING_NOTE } from "./bits";

export const SELECTION_KEY = "blumora-outreach-selection";

/** Saves the chosen contacts for the send page (too many ids for a URL). */
export function rememberSelection(ids: string[]) {
  try {
    sessionStorage.setItem(SELECTION_KEY, JSON.stringify(ids));
  } catch {
    /* private mode – the send page then starts without a selection */
  }
}

export function ContactsBoard({ rows }: { rows: ContactRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const visible = useMemo(() => filterRows(rows, filter), [rows, filter]);
  const selectable = visible.filter((r) => !r.unsubscribed);
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id));

  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const toggleAll = () => setSelected((s) => {
    const n = new Set(s);
    if (allSelected) selectable.forEach((r) => n.delete(r.id));
    else selectable.forEach((r) => n.add(r.id));
    return n;
  });

  if (!rows.length) {
    return (
      <EmptyState>
        Noch keine Kontakte. <Link href="/admin/outreach/kontakte/neu" className="font-semibold text-forest underline-offset-4 hover:underline">Kontakt anlegen</Link> oder{" "}
        <Link href="/admin/outreach/import" className="font-semibold text-forest underline-offset-4 hover:underline">Liste importieren</Link>.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <ContactFilters rows={rows} filter={filter} onChange={setFilter} idPrefix="contacts" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-muted" aria-live="polite">
          {visible.length} von {rows.length} Kontakten{selected.size ? ` · ${selected.size} ausgewählt` : ""}
        </p>
        <button
          type="button"
          disabled={!selected.size}
          onClick={() => { rememberSelection([...selected]); router.push("/admin/outreach/senden?auswahl=1"); }}
          className={btnPrimary}
        >
          <Send className="size-4" aria-hidden /> Ausgewählte anschreiben
        </button>
      </div>
      <Table>
        <thead>
          <tr>
            <Th className="w-10">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Alle gefilterten Kontakte auswählen" className="size-4 accent-forest" />
            </Th>
            <Th>Firma / Kontakt</Th>
            <Th>Kategorie</Th>
            <Th>Bezirk</Th>
            <Th>Status</Th>
            <Th>Letzte Mail</Th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr key={r.id} className={r.unsubscribed ? "opacity-55" : undefined}>
              <Td>
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  disabled={r.unsubscribed}
                  onChange={() => toggle(r.id)}
                  aria-label={`${r.label} auswählen`}
                  className="size-4 accent-forest"
                />
              </Td>
              <Td>
                <Link href={`/admin/outreach/kontakte/${r.id}`} className="font-semibold text-ink underline-offset-4 hover:text-forest hover:underline">{r.label}</Link>
                <p className="text-[12px] text-ink-muted">{[r.company && r.name ? r.name : "", r.email].filter(Boolean).join(" · ")}</p>
                {r.unsubscribed && <UnsubscribedChip />}
              </Td>
              <Td className="whitespace-nowrap text-ink-muted">{CATEGORY_LABELS[r.category]}</Td>
              <Td className="whitespace-nowrap text-ink-muted">{r.district || "–"}</Td>
              <Td><OutreachStatusBadge status={r.status} /></Td>
              <Td className="whitespace-nowrap text-[13px]">
                {r.lastMailedAt ? formatDateShort(r.lastMailedAt.slice(0, 10)) : <span className="text-ink-soft">–</span>}
                {r.queued > 0 && <span className="ml-1 text-[12px] text-warn">· {r.queued} geplant</span>}
                <div className="mt-1"><TrackingChips opened={r.opened} clicked={r.clicked} /></div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="text-[12px] text-ink-soft">{TRACKING_NOTE}</p>
    </div>
  );
}
