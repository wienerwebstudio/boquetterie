import Link from "next/link";
import { getOrders, getSettings } from "@/lib/cms";
import { formatDateShort, formatDateTime, formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Table, Td, Th, inputCls } from "@/components/admin/controls";
import { StatusBadge } from "@/components/admin/status-badge";
import { customerName, isOpenOrder, recipientName, statusLabel } from "@/components/admin/order-utils";
import { cn } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const [orders, settings] = await Promise.all([getOrders(), getSettings()]);

  const filtered = orders
    .filter((o) => {
      if (status === "open") return isOpenOrder(o, settings);
      if (status && o.status !== status) return false;
      return true;
    })
    .filter((o) => {
      if (!q) return true;
      const hay = [o.id, customerName(o), recipientName(o), o.customer.email, o.recipient.zip].join(" ").toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const sum = filtered.reduce((s, o) => s + o.totals.total, 0);

  return (
    <>
      <PageHeader title="Bestellungen" description={`${orders.length} Bestellungen gesamt, ${orders.filter((o) => isOpenOrder(o, settings)).length} offen.`} />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4">
        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <label htmlFor="q" className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Suche</label>
          <input id="q" name="q" defaultValue={q} placeholder="Bestellnummer, Name, E-Mail, PLZ" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Status</label>
          <select id="status" name="status" defaultValue={status} className={cn(inputCls, "min-w-[200px] appearance-none")}>
            <option value="">Alle</option>
            <option value="open">Alle offenen</option>
            {settings.orderStatuses.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm" variant="outline">Filtern</Button>
        {(q || status) && <Button href="/admin/bestellungen" size="sm" variant="ghost">Zurücksetzen</Button>}
      </form>

      {filtered.length === 0 ? (
        <EmptyState>{orders.length === 0 ? "Noch keine Bestellungen vorhanden." : "Keine Bestellungen für diese Filter."}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Nr.</Th><Th>Eingang</Th><Th>Kund:in</Th><Th>Empfänger:in</Th><Th>Lieferdatum</Th><Th>Zahlung</Th><Th>Status</Th><Th className="text-right">Summe</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="hover:bg-ivory-100/60">
                <Td><Link href={`/admin/bestellungen/${o.id}`} className="font-semibold text-forest underline-offset-4 hover:underline">{o.id}</Link></Td>
                <Td className="whitespace-nowrap text-ink-muted">{formatDateTime(o.createdAt)}</Td>
                <Td>{customerName(o)}<div className="text-[12px] text-ink-soft">{o.customer.email}</div></Td>
                <Td>{recipientName(o)}<div className="text-[12px] text-ink-soft">{o.recipient.zip} {o.recipient.city}</div></Td>
                <Td className="whitespace-nowrap">{formatDateShort(o.delivery.date)}{o.delivery.windowLabel ? <div className="text-[12px] text-ink-soft">{o.delivery.windowLabel}</div> : null}</Td>
                <Td className="whitespace-nowrap text-[13px]">{o.payment.status === "paid" ? "Bezahlt" : o.payment.status === "failed" ? "Fehlgeschlagen" : "Ausstehend"}</Td>
                <Td><StatusBadge status={o.status} label={statusLabel(settings, o.status)} /></Td>
                <Td className="whitespace-nowrap text-right font-semibold">{formatPrice(o.totals.total)}</Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <Td className="text-[13px] text-ink-muted" >{filtered.length} Bestellung(en)</Td>
              <Td /><Td /><Td /><Td /><Td /><Td />
              <Td className="whitespace-nowrap text-right font-semibold">{formatPrice(sum)}</Td>
            </tr>
          </tfoot>
        </Table>
      )}
    </>
  );
}
