import Link from "next/link";
import { ArrowUpRight, Download, Wallet } from "lucide-react";
import { getOrders, getPartnerLedgerEntries, getPartnerPortalSettings, getPartners } from "@/lib/cms";
import { EMPTY_BUDGETS, getFloristBudgets } from "@/lib/florist-budget";
import { buildPartnerLedger, ledgerMonths, monthLabel } from "@/lib/partner-ledger";
import { formatPrice } from "@/lib/format";
import { Card, EmptyState, PageHeader, inputCls } from "@/components/admin/controls";

export const dynamic = "force-dynamic";

/** Admin → Partner-Abrechnung: one card per partner (open, paid, owed orders). */
export default async function PartnerBillingOverview() {
  const [partners, orders, budgets, entries, settings] = await Promise.all([
    getPartners(), getOrders(), getFloristBudgets().catch(() => EMPTY_BUDGETS), getPartnerLedgerEntries(), getPartnerPortalSettings(),
  ]);
  const ledgers = partners.map((p) => ({ partner: p, ledger: buildPartnerLedger({ orders, partnerId: p.id, budgets, entries, settings: settings[p.id] }) }));
  const months = [...new Set(ledgers.flatMap((l) => ledgerMonths(l.ledger)))].sort().reverse();
  const year = new Date().getFullYear();
  return (
    <>
      <PageHeader
        title="Partner-Abrechnung"
        description="Was jede Partner-Floristik für bestätigte Aufträge bekommt (Floristen-Budget netto), was schon bezahlt ist und was offen ist. Die Partner sehen dasselbe im Partner-Portal (/partner)."
        back={{ href: "/admin/partner", label: "Partner" }}
      />
      {partners.length === 0 ? (
        <EmptyState>Noch keine Partner angelegt.</EmptyState>
      ) : (
        <>
        <Card accent="teal" icon={Download} title="Abrechnung als PDF" description="Pro Partner: Bestellnummer, Liefertag und sein Budget (netto) mit Summe – zum Schicken an den Partner oder zum Abgleich seiner Rechnung. Ohne Kundendaten." className="mb-5">
          <form method="get" action="/admin/partner-abrechnung/export" className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-[13px] font-semibold text-[#4f4c47]">Partner
              <select name="partner" defaultValue="all" className={`${inputCls} min-w-48`}>
                <option value="all">Alle Partner</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-[13px] font-semibold text-[#4f4c47]">Zeitraum
              <select name="month" defaultValue={months[0] ?? ""} className={`${inputCls} min-w-48`}>
                {months.map((m) => <option key={m} value={m}>Liefermonat {monthLabel(m, year)}</option>)}
                <option value="">Alles (alle Monate)</option>
              </select>
            </label>
            <label className="flex items-center gap-2 pb-2.5 text-[13px] text-[#4f4c47]">
              <input type="checkbox" name="scope" value="open" className="size-4 accent-[#0f9466]" /> nur offene (noch nicht bezahlt)
            </label>
            <button type="submit" name="format" value="pdf" className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#17301f] px-4 text-[14px] font-semibold text-white hover:bg-[#1f4a37]"><Download className="size-4" aria-hidden />PDF herunterladen</button>
            <button type="submit" name="format" value="csv" className="inline-flex h-10 items-center px-2 text-[13px] font-semibold text-[#0a6644] underline-offset-4 hover:underline">Excel</button>
          </form>
        </Card>
        <div className="grid gap-5 lg:grid-cols-2">
          {ledgers.map(({ partner: p, ledger: l }) => {
            return (
              <Card key={p.id} accent="amber" icon={Wallet} title={p.name} description={p.active ? undefined : "inaktiv"}
                actions={<Link href={`/admin/partner-abrechnung/${encodeURIComponent(p.id)}`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#e7e2d9] bg-white px-3 text-[12.5px] font-semibold text-[#0a6644] hover:border-[#0f9466]">Details & Zahlungen<ArrowUpRight className="size-3.5" aria-hidden /></Link>}>
                <dl className="grid grid-cols-3 gap-3 text-[14px]">
                  <div><dt className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#4f4c47]">Offen</dt><dd className="text-[22px] font-bold tabular-nums text-ink">{formatPrice(l.open)}</dd></div>
                  <div><dt className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#4f4c47]">Bezahlt</dt><dd className="text-[22px] font-bold tabular-nums text-ink">{formatPrice(l.paymentsTotal)}</dd></div>
                  <div><dt className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#4f4c47]">Aufträge</dt><dd className="text-[22px] font-bold tabular-nums text-ink">{l.owed.length}</dd></div>
                </dl>
                {l.missingCount > 0 && <p className="mt-3 text-[13px] font-semibold text-[#9a3412]">{l.missingCount} Auftrag/Aufträge: Betrag fehlt</p>}
                {settings[p.id]?.billingFrom && <p className="mt-2 text-[12.5px] text-ink-muted">Abrechnung ab: nach {settings[p.id]?.billingFrom?.orderId}</p>}
              </Card>
            );
          })}
        </div>
        </>
      )}
    </>
  );
}
