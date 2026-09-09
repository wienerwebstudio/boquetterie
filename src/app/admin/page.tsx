import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getAllProducts, getNewsletterSubscribers, getOrders, getSettings } from "@/lib/cms";
import { getLocalNow } from "@/lib/delivery";
import { formatDateShort, formatDateTime, formatPrice } from "@/lib/format";
import { Card, EmptyState, PageHeader, Stat, Table, Td, Th } from "@/components/admin/controls";
import { StatusBadge } from "@/components/admin/status-badge";
import { customerName, isOpenOrder, localDateOf, statusLabel } from "@/components/admin/order-utils";

export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  { href: "/admin/produkte/neu", label: "Neues Produkt anlegen" },
  { href: "/admin/bestellungen?status=open", label: "Offene Bestellungen" },
  { href: "/admin/einstellungen", label: "Ankündigung & Sperrtage" },
  { href: "/admin/liefergebiete", label: "Liefergebiete & Fristen" },
  { href: "/admin/gutscheine/neu", label: "Gutschein erstellen" },
  { href: "/admin/startseite", label: "Startseite bearbeiten" },
];

export default async function AdminOverviewPage() {
  const [orders, products, subscribers, settings] = await Promise.all([
    getOrders(), getAllProducts(true), getNewsletterSubscribers(), getSettings(),
  ]);
  const now = getLocalNow(settings.timezone);
  const ordersToday = orders.filter((o) => localDateOf(o.createdAt, settings.timezone) === now.date);
  const openOrders = orders.filter((o) => isOpenOrder(o, settings));
  const deliveriesToday = orders.filter((o) => o.delivery.date === now.date && isOpenOrder(o, settings));
  const latest = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const placeholders = [settings.brand.legalName, settings.brand.email, settings.brand.phone, settings.brand.address.street].filter((v) => v.startsWith("[")).length;

  return (
    <>
      <PageHeader title="Übersicht" description={`Stand ${formatDateShort(now.date)} – Zeitzone ${settings.timezone}.`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Bestellungen heute" value={ordersToday.length} hint="Eingegangen seit Mitternacht" href="/admin/bestellungen" />
        <Stat label="Offene Bestellungen" value={openOrders.length} hint={`${deliveriesToday.length} Lieferung(en) heute`} href="/admin/bestellungen?status=open" />
        <Stat label="Aktive Produkte" value={products.filter((p) => p.active).length} hint={`${products.length} gesamt`} href="/admin/produkte" />
        <Stat label="Newsletter-Abonnent:innen" value={subscribers.length} href="/admin/newsletter" />
      </div>

      {placeholders > 0 && (
        <div className="mt-4 rounded-md border border-[#ead6bd] bg-[#f8f0e4] px-4 py-3 text-[14px] text-warn">
          {placeholders} Angabe(n) zu Firma/Kontakt sind noch Platzhalter. <Link href="/admin/einstellungen" className="font-semibold underline underline-offset-4">Jetzt in den Einstellungen ergänzen</Link>.
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Neueste Bestellungen</h2>
            <Link href="/admin/bestellungen" className="text-[13px] font-semibold text-forest underline-offset-4 hover:underline">Alle anzeigen</Link>
          </div>
          {latest.length === 0 ? (
            <EmptyState>Noch keine Bestellungen. Sobald die erste Bestellung eingeht, erscheint sie hier.</EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Nr.</Th><Th>Eingang</Th><Th>Kund:in</Th><Th>Lieferung</Th><Th>Status</Th><Th className="text-right">Summe</Th>
                </tr>
              </thead>
              <tbody>
                {latest.map((o) => (
                  <tr key={o.id} className="hover:bg-ivory-100/60">
                    <Td><Link href={`/admin/bestellungen/${o.id}`} className="font-semibold text-forest underline-offset-4 hover:underline">{o.id}</Link></Td>
                    <Td className="whitespace-nowrap text-ink-muted">{formatDateTime(o.createdAt)}</Td>
                    <Td>{customerName(o)}</Td>
                    <Td className="whitespace-nowrap">{formatDateShort(o.delivery.date)}{o.delivery.windowLabel ? ` · ${o.delivery.windowLabel}` : ""}</Td>
                    <Td><StatusBadge status={o.status} label={statusLabel(settings, o.status)} /></Td>
                    <Td className="whitespace-nowrap text-right font-semibold">{formatPrice(o.totals.total)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        <Card title="Schnellzugriff">
          <ul className="space-y-1">
            {QUICK_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="flex items-center justify-between rounded-md px-3 py-2 text-[14px] text-ink transition-colors hover:bg-ivory-100">
                  {l.label} <ArrowUpRight className="size-4 text-ink-soft" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
