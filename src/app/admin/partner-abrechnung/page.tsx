import Link from "next/link";
import { ArrowUpRight, Wallet } from "lucide-react";
import { getOrders, getPartnerLedgerEntries, getPartnerPortalSettings, getPartners } from "@/lib/cms";
import { EMPTY_BUDGETS, getFloristBudgets } from "@/lib/florist-budget";
import { buildPartnerLedger } from "@/lib/partner-ledger";
import { formatPrice } from "@/lib/format";
import { Card, EmptyState, PageHeader } from "@/components/admin/controls";

export const dynamic = "force-dynamic";

/** Admin → Partner-Abrechnung: one card per partner (open, paid, owed orders). */
export default async function PartnerBillingOverview() {
  const [partners, orders, budgets, entries, settings] = await Promise.all([
    getPartners(), getOrders(), getFloristBudgets().catch(() => EMPTY_BUDGETS), getPartnerLedgerEntries(), getPartnerPortalSettings(),
  ]);
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
        <div className="grid gap-5 lg:grid-cols-2">
          {partners.map((p) => {
            const l = buildPartnerLedger({ orders, partnerId: p.id, budgets, entries, settings: settings[p.id] });
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
      )}
    </>
  );
}
