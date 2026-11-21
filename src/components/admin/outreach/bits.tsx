import Link from "next/link";
import type { OutreachStatus } from "@/types/outreach";
import { cn } from "@/lib/format";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/outreach/format";

/** Small building blocks of the Outreach admin (server-safe, no client state). */

export function OutreachStatusBadge({ status, className }: { status: OutreachStatus; className?: string }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold", STATUS_TONES[status], className)}>
      {STATUS_LABELS[status]}
    </span>
  );
}

const TABS = [
  { href: "/admin/outreach", label: "Kontakte" },
  { href: "/admin/outreach/senden", label: "Senden" },
  { href: "/admin/outreach/vorlagen", label: "Vorlagen" },
  { href: "/admin/outreach/versand", label: "Versand & Warteschlange" },
  { href: "/admin/outreach/import", label: "Import" },
] as const;

export function OutreachNav({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Outreach" className="-mt-2 mb-6 flex gap-1 overflow-x-auto border-b border-line">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === active ? "page" : undefined}
          className={cn(
            "-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[14px] font-semibold transition-colors",
            t.href === active ? "border-forest text-forest" : "border-transparent text-ink-muted hover:text-ink",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** "geöffnet" / "geklickt" chips for a contact or send. */
export function TrackingChips({ opened, clicked }: { opened: boolean; clicked: boolean }) {
  if (!opened && !clicked) return null;
  return (
    <span className="inline-flex gap-1">
      {opened && <span title="Öffnungen sind ungefähr – manche Postfächer laden keine Bilder" className="rounded-sm bg-[#e8eef7] px-1.5 py-0.5 text-[11px] font-semibold text-[#2d4a7a]">geöffnet</span>}
      {clicked && <span className="rounded-sm bg-[#e4ebe0] px-1.5 py-0.5 text-[11px] font-semibold text-[#2f6b4f]">geklickt</span>}
    </span>
  );
}

export const TRACKING_NOTE = "Öffnungen sind ungefähr – manche Postfächer laden keine Bilder (dann fehlt die Öffnung), andere laden sie automatisch vor (dann steht „geöffnet“, obwohl niemand gelesen hat).";

export function UnsubscribedChip() {
  return <span className="rounded-sm bg-ivory-200 px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted">abgemeldet</span>;
}

export const btnPrimary = "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-forest px-4 text-[14px] font-semibold text-ivory transition-colors hover:bg-forest-700 disabled:opacity-60";
export const btnOutline = "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line-strong/40 bg-white px-4 text-[14px] font-semibold text-ink transition-colors hover:border-forest disabled:opacity-60";
export const btnDanger = "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#e6c4c4] bg-white px-4 text-[14px] font-semibold text-danger transition-colors hover:bg-[#f8ecec] disabled:opacity-60";
