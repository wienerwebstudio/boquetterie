import Link from "next/link";
import { Plus, Search } from "lucide-react";
import type { OfferStatus } from "@/types";
import { getOffers, getSettings } from "@/lib/cms";
import { getLocalNow } from "@/lib/delivery";
import { OFFER_STATUS_LABELS, offerStatus, offerTotals } from "@/lib/offers-core";
import { cn, formatDateShort, formatDateTime, formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Table, Td, Th, inputCls } from "@/components/admin/controls";
import { OFFER_STATUS_TONES, OfferStatusBadge } from "@/components/admin/offer-status";

export const dynamic = "force-dynamic";

const FILTERS: OfferStatus[] = ["draft", "sent", "viewed", "paid", "expired", "cancelled"];

export default async function OffersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && (FILTERS as string[]).includes(sp.status) ? (sp.status as OfferStatus) : null;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const [offers, settings] = await Promise.all([getOffers(), getSettings()]);
  const today = getLocalNow(settings.timezone).date;
  const rows = offers.map((o) => ({ offer: o, status: offerStatus(o, today), total: offerTotals(o).total }));
  const counts = Object.fromEntries(FILTERS.map((f) => [f, rows.filter((r) => r.status === f).length])) as Record<OfferStatus, number>;

  const filtered = rows
    .filter((r) => !status || r.status === status)
    .filter((r) => {
      if (!q) return true;
      const o = r.offer;
      return [o.id, o.customer.firstName, o.customer.lastName, o.customer.email, o.recipient.firstName, o.recipient.lastName, o.recipient.zip, o.orderId ?? "", ...o.items.map((i) => i.title)].join(" ").toLowerCase().includes(q);
    })
    .sort((a, b) => b.offer.createdAt.localeCompare(a.offer.createdAt));

  const href = (s: OfferStatus | null) => `/admin/angebote${s || q ? `?${new URLSearchParams({ ...(s ? { status: s } : {}), ...(q ? { q } : {}) })}` : ""}`;

  return (
    <>
      <PageHeader
        title="Angebote"
        description="Persönliche Angebote mit Online-Zahlung: anlegen, per Mail oder Link (z. B. WhatsApp) schicken – nach der Zahlung entsteht automatisch eine normale Bestellung."
        actions={<Button href="/admin/angebote/neu" size="sm" icon={<Plus className="size-4" aria-hidden />}>Neues Angebot</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-2" aria-label="Nach Status filtern">
        <Link href={href(null)} aria-current={!status ? "page" : undefined} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold", !status ? "border-[#0f9466] bg-[#0f9466] text-white" : "border-[#e7e2d9] bg-white text-[#4f4c47] hover:border-[#0f9466]")}>
          Alle <span className="tabular-nums opacity-80">{rows.length}</span>
        </Link>
        {FILTERS.map((f) => (
          <Link key={f} href={href(f)} aria-current={status === f ? "page" : undefined}
            className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ring-1 ring-inset", OFFER_STATUS_TONES[f], status === f ? "ring-current" : "ring-transparent hover:ring-current/40")}>
            <span className="size-1.5 rounded-full bg-(--dot)" aria-hidden />{OFFER_STATUS_LABELS[f]} <span className="tabular-nums opacity-80">{counts[f]}</span>
          </Link>
        ))}
      </div>

      <form method="get" className="bl-card mb-5 flex flex-wrap items-end gap-3 p-4" data-accent="amber">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <label htmlFor="q" className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#4f4c47]">Suche</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#5f5c56]" aria-hidden />
            <input id="q" name="q" defaultValue={q} placeholder="Nummer, Name, E-Mail, PLZ, Position" className={cn(inputCls, "pl-9")} />
          </div>
        </div>
        <Button type="submit" size="sm" className="h-10">Suchen</Button>
      </form>

      {filtered.length === 0 ? (
        <EmptyState>{offers.length === 0 ? <>Noch keine Angebote. <Link href="/admin/angebote/neu" className="font-semibold text-[#0a6644] underline-offset-4 hover:underline">Erstes Angebot anlegen</Link></> : "Keine Angebote für diese Filter."}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr><Th>Nr.</Th><Th>Erstellt</Th><Th>Kund:in</Th><Th>Positionen</Th><Th>Lieferung</Th><Th>Gültig bis</Th><Th>Status</Th><Th className="text-right">Summe</Th></tr>
          </thead>
          <tbody>
            {filtered.map(({ offer: o, status: st, total }) => (
              <tr key={o.id}>
                <Td className="whitespace-nowrap"><Link href={`/admin/angebote/${o.id}`} className="font-semibold text-[#0a6644] underline-offset-4 hover:underline">{o.id}</Link></Td>
                <Td className="min-w-[96px] text-[13px] text-[#5f5c56]">{formatDateTime(o.createdAt)}</Td>
                <Td>{o.customer.firstName} {o.customer.lastName}<div className="text-[12px] text-ink-soft">{o.customer.email}</div></Td>
                <Td className="max-w-[260px] text-[13px]">{o.items.map((i) => `${i.quantity > 1 ? `${i.quantity}× ` : ""}${i.title}`).join(", ")}</Td>
                <Td className="whitespace-nowrap">{o.delivery.date ? formatDateShort(o.delivery.date) : "–"}<div className="text-[12px] text-ink-soft">{o.delivery.enabled === false ? "keine Lieferung" : [o.delivery.from && o.delivery.to ? `${o.delivery.from}–${o.delivery.to}` : o.delivery.text, o.recipient.zip].filter(Boolean).join(" · ")}</div></Td>
                <Td className="whitespace-nowrap text-[13px]">{formatDateShort(o.validUntil)}</Td>
                <Td><OfferStatusBadge status={st} />{o.status === "paid" && o.orderId ? <div className="mt-1 text-[12px]"><Link href={`/admin/bestellungen/${o.orderId}`} className="text-[#0a6644] underline-offset-4 hover:underline">{o.orderId}</Link></div> : null}</Td>
                <Td className="whitespace-nowrap text-right font-semibold tabular-nums">{formatPrice(total)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
