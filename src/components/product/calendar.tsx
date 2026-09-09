"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ISODate } from "@/types";
import type { DeliveryDay } from "@/lib/delivery";
import { addDays, weekdayOf } from "@/lib/delivery";
import { formatDateLong, cn } from "@/lib/format";

const WEEKDAYS = [
  { short: "Mo", long: "Montag" }, { short: "Di", long: "Dienstag" }, { short: "Mi", long: "Mittwoch" },
  { short: "Do", long: "Donnerstag" }, { short: "Fr", long: "Freitag" }, { short: "Sa", long: "Samstag" }, { short: "So", long: "Sonntag" },
];
const monthFmt = new Intl.DateTimeFormat("de-AT", { month: "long", year: "numeric", timeZone: "UTC" });

const pad = (n: number) => String(n).padStart(2, "0");
const ym = (iso: string) => iso.slice(0, 7);
/** Monday = 0 … Sunday = 6 */
const mondayIndex = (iso: ISODate) => (weekdayOf(iso) + 6) % 7;
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1, 12));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}
function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return monthFmt.format(new Date(Date.UTC(y, m - 1, 1, 12)));
}
function monthCells(month: string): (ISODate | null)[] {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (ISODate | null)[] = Array.from({ length: mondayIndex(`${month}-01`) }, () => null);
  for (let d = 1; d <= count; d++) cells.push(`${month}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

/**
 * Inline month calendar for the delivery date. Only days from `days` are selectable;
 * everything else is visibly disabled. Keyboard: arrows, Home/End, PageUp/PageDown, Enter/Space.
 */
export function DeliveryCalendar({
  days, value, onChange, today, id = "delivery-calendar", className,
}: {
  days: DeliveryDay[]; value: ISODate | null; onChange: (date: ISODate) => void; today: ISODate; id?: string; className?: string;
}) {
  const available = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const first = days[0]?.date ?? today;
  const last = days[days.length - 1]?.date ?? today;
  const minMonth = ym(today < first ? today : first);
  const maxMonth = ym(last < today ? today : last);

  const [view, setView] = useState(() => ym(value ?? first));
  const [focused, setFocused] = useState<ISODate>(value ?? first);
  const [pendingFocus, setPendingFocus] = useState(false);
  const refs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!pendingFocus) return;
    refs.current.get(focused)?.focus();
    setPendingFocus(false);
  }, [pendingFocus, focused]);

  const rows = useMemo(() => {
    const cells = monthCells(view);
    const out: (ISODate | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [view]);

  const focusDate = (iso: ISODate) => {
    const m = ym(iso);
    if (m < minMonth || m > maxMonth) return;
    setView(m);
    setFocused(iso);
    setPendingFocus(true);
  };
  const goMonth = (delta: number, viaKeyboard = false) => {
    const next = shiftMonth(view, delta);
    if (next < minMonth || next > maxMonth) return;
    setView(next);
    const firstAvailable = days.find((d) => ym(d.date) === next)?.date ?? `${next}-01`;
    setFocused(firstAvailable);
    if (viaKeyboard) setPendingFocus(true);
  };
  const select = (iso: ISODate) => { if (available.has(iso)) onChange(iso); };

  const onKeyDown = (e: React.KeyboardEvent, iso: ISODate) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => focusDate(addDays(iso, 1)),
      ArrowLeft: () => focusDate(addDays(iso, -1)),
      ArrowDown: () => focusDate(addDays(iso, 7)),
      ArrowUp: () => focusDate(addDays(iso, -7)),
      Home: () => focusDate(addDays(iso, -mondayIndex(iso))),
      End: () => focusDate(addDays(iso, 6 - mondayIndex(iso))),
      PageUp: () => goMonth(-1, true),
      PageDown: () => goMonth(1, true),
      Enter: () => select(iso),
      " ": () => select(iso),
    };
    const fn = keys[e.key];
    if (fn) { e.preventDefault(); fn(); }
  };

  const hasSameDay = days.some((d) => d.sameDay);

  return (
    <div className={cn("rounded-md border border-line bg-white/70 p-3 sm:p-4", className)}>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => goMonth(-1)} disabled={view <= minMonth} aria-label="Vorheriger Monat" className="grid size-10 place-items-center rounded-full text-ink-muted transition-colors hover:bg-ivory-200 hover:text-ink disabled:opacity-30">
          <ChevronLeft className="size-4" />
        </button>
        <p id={`${id}-month`} className="font-serif text-[19px] text-ink" aria-live="polite">{monthLabel(view)}</p>
        <button type="button" onClick={() => goMonth(1)} disabled={view >= maxMonth} aria-label="Nächster Monat" className="grid size-10 place-items-center rounded-full text-ink-muted transition-colors hover:bg-ivory-200 hover:text-ink disabled:opacity-30">
          <ChevronRight className="size-4" />
        </button>
      </div>

      <table role="grid" aria-labelledby={`${id}-month`} className="mt-2 w-full border-separate border-spacing-0">
        <thead>
          <tr>
            {WEEKDAYS.map((w) => (
              <th key={w.short} scope="col" className="pb-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
                <abbr title={w.long} className="no-underline">{w.short}</abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((iso, ci) => {
                if (!iso) return <td key={ci} className="p-0" aria-hidden />;
                const day = available.get(iso);
                const selected = iso === value;
                const isToday = iso === today;
                const label = `${formatDateLong(iso)}${day ? (day.sameDay ? ", heute lieferbar" : ", lieferbar") : ", nicht lieferbar"}`;
                return (
                  <td key={iso} role="gridcell" aria-selected={selected} className="p-0 text-center">
                    <button
                      type="button"
                      ref={(el) => { if (el) refs.current.set(iso, el); else refs.current.delete(iso); }}
                      tabIndex={focused === iso ? 0 : -1}
                      aria-disabled={!day || undefined}
                      aria-label={label}
                      onClick={() => { setFocused(iso); select(iso); }}
                      onKeyDown={(e) => onKeyDown(e, iso)}
                      onFocus={() => setFocused(iso)}
                      className={cn(
                        "relative mx-auto my-0.5 grid size-10 place-items-center rounded-full text-[14px] tabular-nums transition-colors sm:size-11",
                        day ? "font-medium text-ink hover:bg-ivory-200" : "cursor-not-allowed text-stone",
                        selected && "bg-forest text-ivory hover:bg-forest",
                        isToday && !selected && "ring-1 ring-inset ring-stone",
                      )}
                    >
                      {Number(iso.slice(8))}
                      {day?.sameDay && <span className={cn("absolute bottom-1.5 size-1 rounded-full", selected ? "bg-ivory" : "bg-success")} aria-hidden />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-[12px] text-ink-muted">
        {hasSameDay && <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-success" aria-hidden /> Heute lieferbar</span>}
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full ring-1 ring-inset ring-stone" aria-hidden /> Heute</span>
        <span className="text-ink-soft">Ausgegraute Tage sind nicht lieferbar.</span>
      </div>
    </div>
  );
}
