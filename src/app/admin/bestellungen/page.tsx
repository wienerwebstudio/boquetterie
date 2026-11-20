import Link from "next/link";
import { Filter, Search } from "lucide-react";
import { getOrders, getSettings } from "@/lib/cms";
import { formatDateShort, formatDateTime, formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Table, Td, Th, inputCls } from "@/components/admin/controls";
import { effectivePartner } from "@/lib/partners";
import { StatusBadge } from "@/components/admin/status-badge";
import { isSelfDeliveryDay } from "@/lib/delivery";
import { customerName, isOpenOrder, isUnpaidOrder, orderLanguage, recipientName, statusLabel } from "@/components/admin/order-utils";
import { cn } from "@/lib/format";
import { listCheckoutDrafts } from "@/lib/checkout-drafts";
import { AbandonedCheckouts } from "@/components/admin/abandoned-checkouts";
import { ExpireStaleOrdersForm } from "@/components/admin/order-forms";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const [orders, settings, drafts] = await Promise.all([getOrders(), getSettings(), listCheckoutDrafts()]);
  const abandoned = status === "abandoned";

  const filtered = orders
    .filter((o) => {
      if (status === "open") return isOpenOrder(o, settings);
      if (status === "unpaid") return isUnpaidOrder(o);
      if (status === "abandoned") return false;
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
      <PageHeader
        title="Bestellungen"
        description={`${orders.length} Bestellungen gesamt, ${orders.filter((o) => isOpenOrder(o, settings)).length} offen (bezahlt), ${orders.filter(isUnpaidOrder).length} nicht bezahlt – für nicht bezahlte Bestellungen nichts binden lassen. ${drafts.length} abgebrochene Kasse(n).`}
        actions={<ExpireStaleOrdersForm />}
      />

      <nav aria-label="Schnellfilter" className="mb-4 flex flex-wrap gap-2 text-[13px]">
        {[
          { key: "", label: "Alle" },
          { key: "unpaid", label: `Nicht bezahlt (${orders.filter(isUnpaidOrder).length})` },
          { key: "abandoned", label: `Abgebrochene Kasse (${drafts.length})` },
        ].map((f) => (
          <Link key={f.key || "all"} href={f.key ? `/admin/bestellungen?status=${f.key}` : "/admin/bestellungen"} aria-current={status === f.key ? "page" : undefined} className={cn("rounded-full border px-3 py-1 font-semibold", status === f.key ? "border-[#0a6644] bg-[#e2f6ec] text-[#0a6644]" : "border-[#dcd8d0] text-[#4f4c47] hover:border-[#0a6644]")}>{f.label}</Link>
        ))}
      </nav>

      <form method="get" className="bl-card mb-5 flex flex-wrap items-end gap-3 p-4" data-accent="emerald">
        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <label htmlFor="q" className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#4f4c47]">Suche</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#5f5c56]" aria-hidden />
            <input id="q" name="q" defaultValue={q} placeholder="Bestellnummer, Name, E-Mail, PLZ" className={cn(inputCls, "pl-9")} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#4f4c47]">Status</label>
          <select id="status" name="status" defaultValue={status} className={cn(inputCls, "min-w-[200px] appearance-none")}>
            <option value="">Alle</option>
            <option value="open">Alle offenen (bezahlt)</option>
            <option value="unpaid">Nicht bezahlt</option>
            <option value="abandoned">Abgebrochene Kasse (ohne Bestellung)</option>
            {settings.orderStatuses.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm" icon={<Filter className="size-4" aria-hidden />} className="h-10">Filtern</Button>
        {(q || status) && <Button href="/admin/bestellungen" size="sm" variant="ghost" className="h-10 rounded-lg">Zurücksetzen</Button>}
      </form>

      {abandoned ? (
        <AbandonedCheckouts drafts={q ? drafts.filter((d) => [d.contact?.firstName, d.contact?.lastName, d.contact?.email, d.contact?.phone, d.recipient?.zip, d.express?.postalCode].join(" ").toLowerCase().includes(q)) : drafts} />
      ) : filtered.length === 0 ? (
        <EmptyState>{orders.length === 0 ? "Noch keine Bestellungen vorhanden." : "Keine Bestellungen für diese Filter."}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Nr.</Th><Th>Eingang</Th><Th>Kund:in</Th><Th>Empfänger:in</Th><Th>Lieferdatum</Th><Th>Zahlung</Th><Th>Partner</Th><Th>Status</Th><Th className="text-right">Summe</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className={cn(isUnpaidOrder(o) && "opacity-60")}>
                <Td className="whitespace-nowrap"><Link href={`/admin/bestellungen/${o.id}`} className="font-semibold text-[#0a6644] underline-offset-4 hover:underline">{o.id}</Link></Td>
                <Td className="min-w-[96px] text-[13px] text-[#5f5c56]">{formatDateTime(o.createdAt)}</Td>
                <Td>{customerName(o)}<div className="text-[12px] text-ink-soft">{o.customer.email}</div>{orderLanguage(o) ? <div className="text-[12px] text-ink-soft">auf {orderLanguage(o)}</div> : null}</Td>
                <Td>{recipientName(o)}<div className="text-[12px] text-ink-soft">{o.recipient.zip} {o.recipient.city}</div></Td>
                <Td className="whitespace-nowrap">{formatDateShort(o.delivery.date)}{o.delivery.windowLabel ? <div className="text-[12px] text-ink-soft">{o.delivery.windowLabel}</div> : null}{isSelfDeliveryDay(settings, o.delivery.date) ? <div className="mt-0.5 inline-flex rounded-full bg-[#dff5f4] px-2 py-0.5 text-[11.5px] font-semibold text-[#0c6467]">Selbst ausliefern</div> : null}</Td>
                <Td className="whitespace-nowrap text-[13px]">{o.payment.status === "paid" ? <span className="inline-flex items-center gap-1.5 font-medium text-[#0a6644]"><span className="size-1.5 rounded-full bg-[#0f9466]" aria-hidden />Bezahlt</span> : o.payment.status === "refunded" ? <span className="inline-flex items-center gap-1.5 font-medium text-[#4a5160]"><span className="size-1.5 rounded-full bg-[#9aa1ad]" aria-hidden />Erstattet</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdecea] px-2 py-0.5 font-semibold text-[#b42318]"><span className="size-1.5 rounded-full bg-[#c0392b]" aria-hidden />Nicht bezahlt</span>}</Td>
                <Td className="whitespace-nowrap text-[13px]">{effectivePartner(o)?.sentAt && !effectivePartner(o)?.cancelSentAt ? <>{effectivePartner(o)?.name}{o.partner?.confirmToken ? <div className={o.partner.confirmedAt ? "text-[12px] text-[#0a6644]" : "text-[12px] font-semibold text-burgundy"}>{o.partner.confirmedAt ? "bestätigt" : "nicht bestätigt"}</div> : null}</> : o.payment.status === "paid" && o.status !== "cancelled" ? <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdecea] px-2 py-0.5 font-semibold text-[#b42318]"><span className="size-1.5 rounded-full bg-[#c0392b]" aria-hidden />Kein Partner</span> : <span className="text-ink-soft">–</span>}</Td>
                <Td><StatusBadge status={o.status} label={statusLabel(settings, o.status)} /></Td>
                <Td className="whitespace-nowrap text-right font-semibold tabular-nums">{formatPrice(o.totals.total)}</Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <Td className="whitespace-nowrap text-[13px] font-semibold text-[#4f4c47]">{filtered.length} Bestellung(en)</Td>
              <Td /><Td /><Td /><Td /><Td /><Td /><Td />
              <Td className="whitespace-nowrap text-right text-[15px] font-bold tabular-nums">{formatPrice(sum)}</Td>
            </tr>
          </tfoot>
        </Table>
      )}
    </>
  );
}
