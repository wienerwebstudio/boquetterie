"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, Send } from "lucide-react";
import { queueOutreachAction } from "@/app/admin/outreach/actions";
import { Banner, Card, Field, inputCls } from "@/components/admin/controls";
import { CATEGORY_LABELS, TEMPLATE_CATEGORY_LABELS } from "@/lib/outreach/format";
import { EMPTY_FILTER, filterRows, type ContactRow } from "@/lib/outreach/rows";
import type { OutreachTemplateCategory } from "@/types/outreach";
import { cn, formatDateShort } from "@/lib/format";
import type { QueueResult } from "@/lib/outreach/service";
import { ContactFilters } from "./contact-filters";
import { SELECTION_KEY } from "./contacts-board";
import { OutreachStatusBadge, TrackingChips, UnsubscribedChip, btnPrimary } from "./bits";

export interface TemplateOption { id: string; name: string; category: OutreachTemplateCategory; language: string }

export function SendComposer({ templates, rows, recentIds, sentToday, limit, today, initialSelection, followUpDefault }: {
  templates: TemplateOption[];
  rows: ContactRow[];
  recentIds: string[];
  sentToday: number;
  limit: number;
  today: string;
  initialSelection: string[];
  followUpDefault: string;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates.find((t) => t.category !== "nachfassen")?.id ?? templates[0]?.id ?? "");
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelection));
  const [mode, setMode] = useState<"now" | "later">("now");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("09:00");
  const [follow, setFollow] = useState(false);
  const [followDays, setFollowDays] = useState(7);
  const [followTemplate, setFollowTemplate] = useState(followUpDefault);
  const [allowRecent, setAllowRecent] = useState(false);
  const [result, setResult] = useState<QueueResult | null>(null);
  const [pending, start] = useTransition();

  // Selection handed over from the contact list / detail page.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SELECTION_KEY);
      if (!raw) return;
      sessionStorage.removeItem(SELECTION_KEY);
      const ids = JSON.parse(raw) as unknown;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hand-over from sessionStorage after mount
      if (Array.isArray(ids)) setSelected(new Set(ids.filter((x): x is string => typeof x === "string")));
    } catch {
      /* ignore */
    }
  }, []);

  const recent = useMemo(() => new Set(recentIds), [recentIds]);
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const visible = useMemo(() => filterRows(rows, filter), [rows, filter]);
  const selectable = visible.filter((r) => !r.unsubscribed);
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id));
  const chosen = [...selected].map((id) => byId.get(id)).filter((r): r is ContactRow => Boolean(r && !r.unsubscribed));
  const chosenRecent = chosen.filter((r) => recent.has(r.id));
  const count = allowRecent ? chosen.length : chosen.length - chosenRecent.length;
  const left = Math.max(0, limit - sentToday);
  const template = templates.find((t) => t.id === templateId);

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

  const submit = () => {
    if (!template || !count) return;
    const when = mode === "now" ? "jetzt" : `am ${formatDateShort(date)} um ${time} Uhr`;
    if (!confirm(`„${template.name}“ ${when} an ${count} Kontakt${count === 1 ? "" : "e"} senden? Jeder Kontakt bekommt eine eigene, persönliche Mail.`)) return;
    setResult(null);
    start(async () => {
      const r = await queueOutreachAction({
        templateId, contactIds: chosen.map((c) => c.id), mode, date, time,
        followUp: { enabled: follow, days: followDays, templateId: followTemplate },
        allowRecent,
      });
      setResult(r);
      if (r.ok) setSelected(new Set());
      router.refresh();
    });
  };

  if (!templates.length) return <Banner tone="warn">Noch keine Vorlage. <Link href="/admin/outreach/vorlagen/neu" className="font-semibold underline">Vorlage anlegen</Link></Banner>;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <Card title="1. Empfänger wählen" description="Jeder ausgewählte Kontakt bekommt eine eigene Mail – nie eine Sammelmail. Abgemeldete Adressen sind ausgegraut.">
          <ContactFilters rows={rows} filter={filter} onChange={setFilter} idPrefix="send" />
          <div className="mt-4 flex items-center justify-between gap-3 border-b border-line pb-2 text-[13px]">
            <label className="inline-flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="size-4 accent-forest" />
              Alle {selectable.length} gefilterten auswählen
            </label>
            <span className="text-ink-muted">{chosen.length} ausgewählt</span>
          </div>
          <ul className="max-h-[520px] divide-y divide-line overflow-y-auto">
            {visible.map((r) => (
              <li key={r.id} className={cn("flex items-center gap-3 py-2.5", r.unsubscribed && "opacity-50")}>
                <input type="checkbox" checked={selected.has(r.id)} disabled={r.unsubscribed} onChange={() => toggle(r.id)} aria-label={`${r.label} auswählen`} className="size-4 shrink-0 accent-forest" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">{r.label}</p>
                  <p className="truncate text-[12px] text-ink-muted">{[CATEGORY_LABELS[r.category], r.district, r.email].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <OutreachStatusBadge status={r.status} />
                  {r.unsubscribed ? <UnsubscribedChip /> : recent.has(r.id) ? <span className="text-[11px] font-semibold text-warn">zuletzt {r.lastMailedAt ? formatDateShort(r.lastMailedAt.slice(0, 10)) : ""}</span> : <TrackingChips opened={r.opened} clicked={r.clicked} />}
                </div>
              </li>
            ))}
            {!visible.length && <li className="py-6 text-center text-[14px] text-ink-muted">Keine Kontakte für diesen Filter.</li>}
          </ul>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Card title="2. Vorlage">
          <select aria-label="Vorlage" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={inputCls}>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({TEMPLATE_CATEGORY_LABELS[t.category]}, {t.language.toUpperCase()})</option>)}
          </select>
          {template && <Link href={`/admin/outreach/vorlagen/${template.id}`} className="mt-2 inline-block text-[13px] font-semibold text-forest underline-offset-4 hover:underline">Vorlage ansehen / Test-Mail</Link>}
        </Card>

        <Card title="3. Zeitpunkt">
          <div className="space-y-2 text-[14px]">
            <label className="flex items-center gap-2"><input type="radio" name="when" checked={mode === "now"} onChange={() => setMode("now")} className="accent-forest" /> Jetzt senden</label>
            <label className="flex items-center gap-2"><input type="radio" name="when" checked={mode === "later"} onChange={() => setMode("later")} className="accent-forest" /> Planen (Wiener Zeit)</label>
          </div>
          {mode === "later" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Field label="Datum" htmlFor="s-date"><input id="s-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
              <Field label="Uhrzeit" htmlFor="s-time"><input id="s-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} /></Field>
            </div>
          )}
          <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
            Heute gesendet: {sentToday} von {limit}. {mode === "now" ? (count > left ? `${left} gehen jetzt raus, die übrigen ${count - left} bleiben in der Warteschlange und gehen ab morgen raus.` : "Alle gehen sofort raus (bei vielen Mails in Etappen alle 10 Minuten).") : "Geplante Mails werden alle 10 Minuten abgearbeitet; das Tageslimit gilt auch hier."}
          </p>
        </Card>

        <Card title="4. Nachfassen (optional)">
          <label className="flex items-start gap-2 text-[14px]">
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="mt-1 accent-forest" />
            <span>Automatisch nachfassen – einmal, nur wenn der Kontakt dann noch „Angeschrieben“ ist und sich nicht abgemeldet hat.</span>
          </label>
          {follow && (
            <div className="mt-3 grid grid-cols-[90px_1fr] gap-2">
              <Field label="Nach Tagen" htmlFor="s-fdays"><input id="s-fdays" type="number" min={1} max={90} value={followDays} onChange={(e) => setFollowDays(Number(e.target.value))} className={inputCls} /></Field>
              <Field label="Vorlage" htmlFor="s-ftpl">
                <select id="s-ftpl" value={followTemplate} onChange={(e) => setFollowTemplate(e.target.value)} className={inputCls}>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
            </div>
          )}
        </Card>

        {chosenRecent.length > 0 && (
          <div role="alert" className="rounded-md border border-[#ead6bd] bg-[#f8f0e4] px-4 py-3 text-[13px] text-warn">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" aria-hidden /> {chosenRecent.length} Kontakt{chosenRecent.length === 1 ? " wurde" : "e wurden"} in den letzten 30 Tagen schon angeschrieben:</p>
            <p className="mt-1 text-ink">{chosenRecent.slice(0, 8).map((r) => r.label).join(", ")}{chosenRecent.length > 8 ? ` und ${chosenRecent.length - 8} weitere` : ""}</p>
            <label className="mt-2 flex items-center gap-2 font-semibold text-ink">
              <input type="checkbox" checked={allowRecent} onChange={(e) => setAllowRecent(e.target.checked)} className="accent-forest" /> Trotzdem senden
            </label>
            {!allowRecent && <p className="mt-1">Ohne Haken werden diese Kontakte ausgelassen.</p>}
          </div>
        )}

        <button type="button" disabled={pending || !count || !template} onClick={submit} className={cn(btnPrimary, "h-12 w-full text-[15px]")}>
          <Send className="size-4" aria-hidden />
          {pending ? "Wird gesendet …" : mode === "now" ? `${count} Mail${count === 1 ? "" : "s"} senden` : `${count} Mail${count === 1 ? "" : "s"} planen`}
        </button>
        {result && (
          <Banner tone={result.ok ? "success" : "error"}>
            {result.message}
            {result.skipped.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-[13px]">
                {result.skipped.slice(0, 10).map((s) => <li key={s.id}>{s.label}: {s.reason}</li>)}
              </ul>
            )}
            <Link href="/admin/outreach/versand" className="mt-2 block font-semibold underline">Zum Versand-Protokoll</Link>
          </Banner>
        )}
      </div>
    </div>
  );
}
