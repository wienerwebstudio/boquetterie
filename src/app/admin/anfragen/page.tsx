import Link from "next/link";
import { ImageIcon, Search } from "lucide-react";
import type { CustomRequestStatus } from "@/types";
import { getInbox } from "@/lib/custom-requests";
import { CUSTOM_REQUEST_STATUSES, STATUS_LABELS } from "@/lib/custom-requests-core";
import { cn, formatDateShort, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Table, Td, Th, inputCls } from "@/components/admin/controls";
import { REQUEST_STATUS_TONES, RequestStatusBadge, RequestTypeBadge, TopicBadges } from "@/components/admin/request-status";

export const dynamic = "force-dynamic";

/** Inbox: requests from /anfrage and messages from the contact form, newest first. */
export default async function RequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && (CUSTOM_REQUEST_STATUSES as readonly string[]).includes(sp.status) ? (sp.status as CustomRequestStatus) : null;
  const type = sp.typ === "anfrage" ? "request" : sp.typ === "kontakt" ? "contact" : null;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const rows = await getInbox();
  const counts = Object.fromEntries(CUSTOM_REQUEST_STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length])) as Record<CustomRequestStatus, number>;

  const filtered = rows
    .filter((r) => !status || r.status === status)
    .filter((r) => !type || r.type === type)
    .filter((r) => !q || [r.id, r.name, r.email, r.preview, ...r.tags].join(" ").toLowerCase().includes(q));

  const href = (s: CustomRequestStatus | null) => {
    const p = new URLSearchParams({ ...(s ? { status: s } : {}), ...(sp.typ && typeof sp.typ === "string" ? { typ: sp.typ } : {}), ...(q ? { q } : {}) });
    const qs = p.toString();
    return `/admin/anfragen${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Anfragen"
        description="Sonderwünsche und Lieferfragen von der Seite „Anfrage“ und Nachrichten aus dem Kontaktformular – an einem Ort. Aus einer Anfrage wird mit einem Klick ein Angebot."
      />

      <div className="mb-4 flex flex-wrap gap-2" aria-label="Nach Status filtern">
        <Link href={href(null)} aria-current={!status ? "page" : undefined} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold", !status ? "border-[#0f9466] bg-[#0f9466] text-white" : "border-[#e7e2d9] bg-white text-[#4f4c47] hover:border-[#0f9466]")}>
          Alle <span className="tabular-nums opacity-80">{rows.length}</span>
        </Link>
        {CUSTOM_REQUEST_STATUSES.map((f) => (
          <Link key={f} href={href(f)} aria-current={status === f ? "page" : undefined}
            className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ring-1 ring-inset", REQUEST_STATUS_TONES[f], status === f ? "ring-current" : "ring-transparent hover:ring-current/40")}>
            <span className="size-1.5 rounded-full bg-(--dot)" aria-hidden />{STATUS_LABELS[f]} <span className="tabular-nums opacity-80">{counts[f]}</span>
          </Link>
        ))}
      </div>

      <form method="get" className="bl-card mb-5 flex flex-wrap items-end gap-3 p-4" data-accent="amber">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <label htmlFor="q" className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#4f4c47]">Suche</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#5f5c56]" aria-hidden />
            <input id="q" name="q" defaultValue={q} placeholder="Nummer, Name, E-Mail, Text" className={cn(inputCls, "pl-9")} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="typ" className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#4f4c47]">Art</label>
          <select id="typ" name="typ" defaultValue={typeof sp.typ === "string" ? sp.typ : ""} className={cn(inputCls, "w-40 appearance-none")}>
            <option value="">Alle</option>
            <option value="anfrage">Anfrage</option>
            <option value="kontakt">Kontakt</option>
          </select>
        </div>
        <Button type="submit" size="sm" className="h-10">Suchen</Button>
      </form>

      {filtered.length === 0 ? (
        <EmptyState>{rows.length === 0 ? "Noch keine Anfragen." : "Keine Anfragen für diese Filter."}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr><Th>Nr.</Th><Th>Eingang</Th><Th>Von</Th><Th>Worum geht es?</Th><Th>Termin</Th><Th>Status</Th></tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} data-testid="inbox-row">
                <Td className="whitespace-nowrap">
                  <div className="mb-1"><RequestTypeBadge type={r.type} /></div>
                  <Link href={`/admin/anfragen/${r.id}`} className="font-semibold text-[#0a6644] underline-offset-4 hover:underline">{r.id}</Link>
                </Td>
                <Td className="min-w-[96px] text-[13px] text-[#5f5c56]">{formatDateTime(r.createdAt)}</Td>
                <Td>{r.name}<div className="text-[12px] text-ink-soft">{r.email}</div></Td>
                <Td className="max-w-[340px]">
                  <TopicBadges tags={r.tags} type={r.type} />
                  <p className="mt-1 line-clamp-2 text-[13px] text-[#5f5c56]">{r.hasPhoto && <ImageIcon className="me-1 inline size-3.5 align-[-2px]" aria-label="mit Foto" />}{r.preview}</p>
                </Td>
                <Td className="whitespace-nowrap text-[13px]">{r.date ? formatDateShort(r.date) : "–"}</Td>
                <Td>
                  <RequestStatusBadge status={r.status} />
                  {r.offerId && <div className="mt-1 text-[12px]"><Link href={`/admin/angebote/${r.offerId}`} className="text-[#0a6644] underline-offset-4 hover:underline">{r.offerId}</Link></div>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
