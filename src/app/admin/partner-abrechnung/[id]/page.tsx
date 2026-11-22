import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Download, KeyRound, ListChecks, Receipt, Store, Wallet } from "lucide-react";
import { getOrders, getPartnerLedgerEntries, getPartnerPortalSettings, getPartners, getSettings } from "@/lib/cms";
import { EMPTY_BUDGETS, getFloristBudgets } from "@/lib/florist-budget";
import { buildPartnerLedger, inBillingPeriod, ledgerMonths, monthLabel } from "@/lib/partner-ledger";
import { effectivePartner } from "@/lib/partners";
import { partnerMailAddresses } from "@/lib/mail";
import { portalEmailsFor } from "@/lib/partner-auth";
import { getLocalNow } from "@/lib/delivery";
import { formatDateShort, formatDateTime, formatPrice } from "@/lib/format";
import { recipientName } from "@/components/admin/order-utils";
import { Card, PageHeader, Stat, Table, Td, Th } from "@/components/admin/controls";
import { AssignOrdersForm, BillingFromForm, DeleteLedgerEntryButton, LedgerEntryForm, PortalEmailsForm, type UnassignedRow } from "@/components/admin/partner-billing-forms";

export const dynamic = "force-dynamic";

const summary = (o: { lines: { quantity: number; productName: string; sizeLabel: string; custom?: boolean }[] }) =>
  o.lines.map((l) => `${l.quantity > 1 ? `${l.quantity} × ` : ""}${l.productName}${l.custom ? "" : ` (${l.sizeLabel})`}`).join(", ");

export default async function PartnerBillingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = decodeURIComponent(raw);
  const [partners, orders, budgets, entries, portal, settings] = await Promise.all([
    getPartners(), getOrders(), getFloristBudgets().catch(() => EMPTY_BUDGETS), getPartnerLedgerEntries(), getPartnerPortalSettings(), getSettings(),
  ]);
  const partner = partners.find((p) => p.id === id);
  if (!partner) notFound();
  const ps = portal[partner.id];
  const ledger = buildPartnerLedger({ orders, partnerId: partner.id, budgets, entries, settings: ps });
  const today = getLocalNow(settings.timezone).date;
  const year = Number(today.slice(0, 4));

  const paidOrders = orders.filter((o) => o.payment.status === "paid").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const cutoffOptions = paidOrders.slice(0, 300).map((o) => ({
    id: o.id,
    label: `${o.id} · ${formatDateTime(o.createdAt)} · ${o.customer.firstName} ${o.customer.lastName}`.trim() + (effectivePartner(o) ? ` · ${effectivePartner(o)?.name}` : " · ohne Partner"),
  }));
  if (ps?.billingFrom && !cutoffOptions.some((o) => o.id === ps.billingFrom?.orderId)) cutoffOptions.unshift({ id: ps.billingFrom.orderId, label: `${ps.billingFrom.orderId} · ${formatDateTime(ps.billingFrom.createdAt)}` });
  const unassigned: UnassignedRow[] = paidOrders
    .filter((o) => !effectivePartner(o) && inBillingPeriod(o, ps?.billingFrom))
    .map((o) => ({ id: o.id, created: formatDateTime(o.createdAt), delivery: formatDateShort(o.delivery.date), summary: summary(o), recipient: recipientName(o), total: o.totals.total }));
  const months = ledgerMonths(ledger);
  const ledgerRows = [...ledger.payments, ...ledger.corrections].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <PageHeader
        back={{ href: "/admin/partner-abrechnung", label: "Partner-Abrechnung" }}
        title={`${partner.name} – Abrechnung`}
        description="Geschuldet ist ein Auftrag, sobald der Partner ihn bestätigt hat (bleibt auch bei späterem Storno). Vor dem Portal-Start gelieferte Aufträge ohne Bestätigung zählen als bestätigt. Nur bezahlte Bestellungen nach „Abrechnung ab“."
        actions={<Link href={`/admin/partner/${encodeURIComponent(partner.id)}`} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[13px] font-semibold text-ink hover:border-forest/50"><Store className="size-4" aria-hidden />Partner bearbeiten</Link>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Offen" value={formatPrice(ledger.open)} accent="amber" icon={Wallet} hint={`geschuldet ${formatPrice(ledger.owedTotal)}${ledger.correctionsTotal ? ` · Korrekturen ${formatPrice(ledger.correctionsTotal)}` : ""}`} />
        <Stat label="Bezahlt" value={formatPrice(ledger.paymentsTotal)} accent="emerald" icon={Receipt} hint={`${ledger.payments.length} Zahlung(en)`} />
        <Stat label="Aufträge" value={ledger.owed.length} accent="sky" icon={ListChecks} hint={ledger.missingCount ? `${ledger.missingCount} × Betrag fehlt` : "alle mit Betrag"} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-5">
          <Card accent="amber" icon={ListChecks} title="Geschuldete Aufträge" description="Älteste zuerst – Zahlungen begleichen die ältesten offenen Aufträge zuerst (FIFO).">
            {ledger.owed.length === 0 ? (
              <p className="text-[14px] text-ink-muted">Noch keine geschuldeten Aufträge{ps?.billingFrom ? ` nach ${ps.billingFrom.orderId}` : ""}.</p>
            ) : (
              <Table className="lg:max-h-none">
                <thead><tr><Th>Bestellung</Th><Th>Liefertag</Th><Th>Strauß</Th><Th>Bestätigt</Th><Th className="text-right">Betrag</Th><Th /></tr></thead>
                <tbody>
                  {ledger.owed.map((i) => (
                    <tr key={i.order.id}>
                      <Td><Link href={`/admin/bestellungen/${encodeURIComponent(i.order.id)}`} className="font-semibold text-[#0a6644] hover:underline">{i.order.id}</Link>{i.order.status === "cancelled" && <span className="ml-1 text-[12px] text-ink-muted">(storniert)</span>}</Td>
                      <Td className="whitespace-nowrap">{formatDateShort(i.order.delivery.date)}</Td>
                      <Td className="text-[13px]">{summary(i.order)}</Td>
                      <Td className="whitespace-nowrap text-[13px]">{i.owed === "legacy" ? "geliefert vor Start" : effectivePartner(i.order)?.confirmedAt ? formatDateTime(effectivePartner(i.order)!.confirmedAt!) : ""}</Td>
                      <Td className="whitespace-nowrap text-right tabular-nums">
                        <span className="font-semibold">{formatPrice(i.amount)}</span>
                        {i.missing && <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-[#fef6e4] px-2 py-0.5 text-[11.5px] font-semibold text-[#7d4800]"><AlertTriangle className="size-3" aria-hidden />Betrag fehlt</span>}
                        {!i.missing && i.computed && <span className="ml-1.5 text-[11.5px] text-ink-muted">aus aktueller Liste</span>}
                      </Td>
                      <Td>{i.paid ? <span className="rounded-full bg-[#e2f6ec] px-2.5 py-0.5 text-[12px] font-semibold text-[#0a6644]">bezahlt</span> : <span className="rounded-full bg-[#fdf2db] px-2.5 py-0.5 text-[12px] font-semibold text-[#8a5000]">offen</span>}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            {ledger.unconfirmedDelivered.length > 0 && (
              <p className="mt-4 text-[13px] text-[#7d4800]"><strong>Geliefert, aber nicht bestätigt (zählt nicht):</strong> {ledger.unconfirmedDelivered.map((i) => i.order.id).join(", ")} – ggf. beim Partner nachfragen oder eine Korrektur erfassen.</p>
            )}
          </Card>

          <Card accent="emerald" icon={Receipt} title="Zahlungen & Korrekturen">
            <div className="space-y-6">
              <div><h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.07em] text-[#4f4c47]">Zahlung erfassen</h3><LedgerEntryForm partnerId={partner.id} kind="payment" today={today} /></div>
              <div><h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.07em] text-[#4f4c47]">Korrektur (+/−)</h3><LedgerEntryForm partnerId={partner.id} kind="correction" today={today} /></div>
              {ledgerRows.length > 0 && (
                <ul className="divide-y divide-[#efebe4] rounded-xl border border-[#e7e2d9]">
                  {ledgerRows.map((e) => (
                    <li key={e.id} className="px-4 py-3 text-[14px]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span><span className="font-semibold">{e.kind === "payment" ? "Zahlung" : "Korrektur"}</span> · {formatDateShort(e.date)} · <span className="tabular-nums font-semibold">{formatPrice(e.amount)}</span>{e.note ? <span className="text-ink-muted"> · {e.note}</span> : null}</span>
                        <DeleteLedgerEntryButton partnerId={partner.id} entryId={e.id} label={`${e.kind === "payment" ? "Zahlung" : "Korrektur"} über ${formatPrice(e.amount)}`} />
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[12.5px] font-semibold text-[#0a6644]">Bearbeiten</summary>
                        <div className="mt-3"><LedgerEntryForm partnerId={partner.id} kind={e.kind} today={today} entry={e} /></div>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card accent="violet" icon={ListChecks} title="Aufträge ohne Partner zuordnen" description={`Bezahlte Bestellungen ohne Partner${ps?.billingFrom ? ` nach ${ps.billingFrom.orderId}` : ""}. Zuordnen schickt KEINE Mail und bucht keinen Fahrer – nur für die Abrechnung.`}>
            {unassigned.length === 0 ? <p className="text-[14px] text-ink-muted">Keine bezahlten Bestellungen ohne Partner.</p> : <AssignOrdersForm partnerId={partner.id} partnerName={partner.name} rows={unassigned} />}
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card accent="sky" icon={KeyRound} title="Portal-Zugang" description="Wer sich unter /partner mit einem Login-Link anmelden darf. Sitzung 90 Tage.">
            <PortalEmailsForm partnerId={partner.id} emails={ps?.emails ?? []} usesDefault={!ps?.emails} defaults={partnerMailAddresses(partner)} />
            <p className="mt-3 text-[12.5px] text-ink-muted">Freigeschaltet: {portalEmailsFor(partner, ps).join(", ") || "niemand"}{partner.active ? "" : " (Partner inaktiv – kein Login möglich)"}</p>
          </Card>
          <Card accent="rose" icon={Wallet} title="Abrechnung ab" description={ps?.billingFrom ? `Derzeit: nach ${ps.billingFrom.orderId} (${formatDateTime(ps.billingFrom.createdAt)}).` : "Derzeit zählen alle Bestellungen."}>
            <BillingFromForm partnerId={partner.id} current={ps?.billingFrom?.orderId} options={cutoffOptions} />
          </Card>
          <Card accent="teal" icon={Download} title="Export (Excel)" description="Geschuldete Aufträge eines Liefermonats als CSV.">
            {months.length === 0 ? <p className="text-[14px] text-ink-muted">Noch nichts zu exportieren.</p> : (
              <ul className="flex flex-wrap gap-2">
                {months.map((m) => (
                  <li key={m}><a href={`/admin/partner-abrechnung/export?partner=${encodeURIComponent(partner.id)}&month=${m}`} download className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[13px] font-semibold text-ink hover:border-forest/50"><Download className="size-3.5" aria-hidden />{monthLabel(m, year)}</a></li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
