import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, BadgeEuro, Clock, CreditCard, Globe, Percent, ShoppingBag, Truck, Users } from "lucide-react";
import { getCheckoutDrafts, getOrders, getSettings } from "@/lib/cms";
import { getLocalNow } from "@/lib/delivery";
import { LIVE_LOCALES } from "@/i18n/config";
import { buildDashboard, shiftDate, type Row } from "@/lib/analytics-dashboard";
import { classifyChannel } from "@/lib/attribution";
import { getMetric, getStats, umamiConfigured, umamiRange } from "@/lib/umami-api";
import { cn, formatDateShort, formatPrice } from "@/lib/format";
import { Banner, Card, EmptyState, PageHeader, Stat, Table, Td, Th, type Accent } from "@/components/admin/controls";
import { LANGUAGE_NAMES_DE, PAYMENT_LABELS } from "@/components/admin/order-utils";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "ceo", label: "CEO" },
  { id: "marketing", label: "Marketing & Attribution" },
  { id: "checkout", label: "Checkout & Conversion" },
  { id: "i18n", label: "Internationalisierung" },
  { id: "produkte", label: "Produktperformance" },
  { id: "lieferung", label: "Lieferungen & Operations" },
] as const;
type Tab = (typeof TABS)[number]["id"];
const RANGES = [
  { id: "7", label: "7 Tage" },
  { id: "30", label: "30 Tage" },
  { id: "90", label: "90 Tage" },
  { id: "all", label: "Gesamt" },
] as const;

/** Funnel steps from the Umami events (see docs/ANALYTICS.md). */
const FUNNEL = [
  { event: "view_item", label: "Produkt angesehen" },
  { event: "add_to_cart", label: "In den Warenkorb" },
  { event: "begin_checkout", label: "Kasse geöffnet" },
  { event: "address_completed", label: "Adresse ausgefüllt" },
  { event: "delivery_slot_selected", label: "Lieferzeit gewählt" },
  { event: "payment_method_selected", label: "Zahlart gewählt" },
  { event: "payment_started", label: "Zahlung gestartet" },
  { event: "purchase", label: "Bezahlt" },
];

const FAILURE_LABELS: Record<string, string> = {
  card_declined: "Karte abgelehnt", insufficient_funds: "Deckung unzureichend", payment_intent_authentication_failure: "3-D-Secure fehlgeschlagen",
  authentication_required: "Freigabe nötig", expired_card: "Karte abgelaufen", incorrect_cvc: "Falscher CVC", processing_error: "Verarbeitungsfehler",
  incomplete_details: "Angaben unvollständig", abandoned: "Abgebrochen", pending: "Noch offen", unknown: "Unbekannt", generic_decline: "Allgemein abgelehnt",
};

const pctFmt = (n: number) => `${n.toLocaleString("de-AT", { maximumFractionDigits: 1 })} %`;
const langLabel = (l: string) => LANGUAGE_NAMES_DE[l] ?? l;

function Bars({ rows, format = (n: number) => String(n), color = "#0f9466" }: { rows: { label: string; v: number }[]; format?: (n: number) => string; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.v));
  if (!rows.length) return <p className="text-[13px] text-[#5f5c56]">Noch keine Daten im Zeitraum.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-[13px]">
          <span className="truncate text-ink" title={r.label}>{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-[#f1ede6]" aria-hidden>
            <span className="block h-full rounded-full" style={{ width: `${Math.max(2, (r.v / max) * 100)}%`, background: color }} />
          </span>
          <span className="tabular-nums font-semibold text-ink">{format(r.v)}</span>
        </li>
      ))}
    </ul>
  );
}

function RowTable({ rows, first, empty = "Noch keine Daten im Zeitraum.", extra }: { rows: Row[]; first: string; empty?: string; extra?: { head: string; cell: (r: Row) => ReactNode } }) {
  if (!rows.length) return <EmptyState>{empty}</EmptyState>;
  return (
    <Table>
      <thead><tr><Th>{first}</Th><Th className="text-right">Bestellungen</Th><Th className="text-right">Umsatz</Th><Th className="text-right">Anteil</Th><Th className="text-right">Ø Bestellwert</Th>{extra && <Th className="text-right">{extra.head}</Th>}</tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <Td>{r.label}</Td><Td className="text-right tabular-nums">{r.orders}</Td><Td className="text-right tabular-nums">{formatPrice(r.revenue)}</Td>
            <Td className="text-right tabular-nums">{pctFmt(r.share)}</Td><Td className="text-right tabular-nums">{formatPrice(r.aov)}</Td>
            {extra && <Td className="text-right tabular-nums">{extra.cell(r)}</Td>}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function Grid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", cols === 3 && "xl:grid-cols-3", cols === 4 && "xl:grid-cols-4")}>{children}</div>;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ tab?: string; range?: string }> }) {
  const sp = await searchParams;
  const tab: Tab = (TABS.find((t) => t.id === sp.tab)?.id ?? "ceo") as Tab;
  const range = RANGES.find((r) => r.id === sp.range)?.id ?? "30";
  const days = range === "all" ? null : Number(range);

  const [orders, drafts, settings] = await Promise.all([getOrders(), getCheckoutDrafts(), getSettings()]);
  const today = getLocalNow(settings.timezone).date;
  const d = buildDashboard({ orders, drafts, today, days });

  // Optional Umami figures (traffic, funnel, referrers, languages) for the same period.
  const umami = umamiConfigured();
  const { startAt, endAt } = umamiRange(days ? d.from : shiftDate(today, -364));
  const needs = { stats: tab === "ceo" || tab === "marketing" || tab === "checkout", events: tab === "checkout", referrer: tab === "marketing", language: tab === "i18n" };
  const [stats, events, referrers, languages] = umami
    ? await Promise.all([
      needs.stats ? getStats(startAt, endAt) : null,
      needs.events ? getMetric("event", startAt, endAt, 100) : null,
      needs.referrer ? getMetric("referrer", startAt, endAt, 50) : null,
      needs.language ? getMetric("language", startAt, endAt, 50) : null,
    ])
    : [null, null, null, null];
  const conversion = stats?.visitors ? (d.ceo.paidOrders / stats.visitors) * 100 : null;

  const href = (t: string, r: string) => `/admin/analytics?tab=${t}&range=${r}`;
  const periodLabel = days ? `${formatDateShort(d.from)} – ${formatDateShort(d.to)}` : `bis ${formatDateShort(d.to)}`;

  return (
    <>
      <PageHeader
        title="Analytics"
        description={`Zahlen aus Bestellungen, Zahlungen und Checkout${umami ? " sowie Umami (Besucher & Events)" : ""}. Zeitraum: ${periodLabel}. Testzahlungen sind ausgeschlossen.`}
        actions={
          <nav aria-label="Zeitraum" className="flex flex-wrap gap-1.5">
            {RANGES.map((r) => (
              <Link key={r.id} href={href(tab, r.id)} aria-current={r.id === range ? "true" : undefined}
                className={cn("rounded-full border px-3 py-1 text-[13px] font-semibold", r.id === range ? "border-[#0f9466] bg-[#e2f6ec] text-[#0a6644]" : "border-[#e7e2d9] bg-white text-[#4f4c47] hover:border-[#0f9466]")}>
                {r.label}
              </Link>
            ))}
          </nav>
        }
      />

      <nav aria-label="Dashboards" className="mb-6 flex flex-wrap gap-2 border-b border-[#e7e2d9] pb-3">
        {TABS.map((t) => (
          <Link key={t.id} href={href(t.id, range)} aria-current={t.id === tab ? "page" : undefined}
            className={cn("rounded-lg px-3.5 py-2 text-[14px] font-semibold", t.id === tab ? "bg-[#17301f] text-white" : "text-[#4f4c47] hover:bg-[#f1ede6]")}>
            {t.label}
          </Link>
        ))}
      </nav>

      {!umami && (
        <Banner tone="info" className="mb-5">
          Besucherzahlen und der Event-Trichter aus Umami erscheinen hier, sobald <code>UMAMI_API_KEY</code> in Netlify gesetzt ist (Umami → Einstellungen → API-Schlüssel). Alle anderen Zahlen kommen direkt aus den Bestellungen.
        </Banner>
      )}

      <div className="space-y-6" data-testid={`analytics-${tab}`}>
        {tab === "ceo" && <Ceo d={d} visitors={stats?.visitors ?? null} conversion={conversion} />}
        {tab === "marketing" && <Marketing d={d} referrers={referrers} />}
        {tab === "checkout" && <Checkout d={d} events={events} visitors={stats?.visitors ?? null} />}
        {tab === "i18n" && <I18n d={d} languages={languages} />}
        {tab === "produkte" && <Products d={d} />}
        {tab === "lieferung" && <Ops d={d} />}
      </div>
    </>
  );
}

type D = ReturnType<typeof buildDashboard>;

function Ceo({ d, visitors, conversion }: { d: D; visitors: number | null; conversion: number | null }) {
  const c = d.ceo;
  const maxRev = Math.max(1, ...c.series.map((p) => p.revenue));
  const lowMargin = d.products.items.filter((p) => p.margin !== null && p.margin < 15 && p.qty > 0);
  const alerts: string[] = [];
  if (d.ops.unconfirmed) alerts.push(`${d.ops.unconfirmed} Bestellung(en) an Partner gesendet, aber noch nicht bestätigt.`);
  if (d.ops.unassigned) alerts.push(`${d.ops.unassigned} offene Bestellung(en) ohne Partner.`);
  if (c.attempts >= 5 && c.paymentSuccess < 70) alerts.push(`Nur ${pctFmt(c.paymentSuccess)} der Bestellversuche wurden bezahlt – siehe Checkout & Conversion.`);
  for (const p of lowMargin) alerts.push(`${p.name}: Rohertrag nur ${pctFmt(p.margin!)}.`);
  return (
    <>
      <Grid>
        <Stat label="Umsatz" value={formatPrice(c.revenue)} hint={`${c.paidOrders} bezahlte Bestellung(en)`} icon={BadgeEuro} accent="emerald" />
        <Stat label="Ø Bestellwert" value={formatPrice(c.aov)} hint={`Lieferkosten ${formatPrice(c.deliveryFees)} · Rabatte ${formatPrice(c.discounts)}`} icon={ShoppingBag} accent="sky" />
        <Stat label="Rohertrag" value={formatPrice(c.grossProfit)} hint={`${pctFmt(c.grossMargin)} Marge nach Floristen-Einkauf${c.ordersWithoutCost ? ` · ${c.ordersWithoutCost} ohne Budget` : ""}`} icon={Percent} accent="violet" />
        <Stat label="Zahlungserfolg" value={pctFmt(c.paymentSuccess)} hint={`${c.attempts} Bestellversuch(e) · Erstattet ${formatPrice(c.refunds)}`} icon={CreditCard} accent="amber" />
      </Grid>
      {visitors !== null && (
        <Grid cols={2}>
          <Stat label="Besucher (Umami)" value={visitors.toLocaleString("de-AT")} icon={Users} accent="teal" />
          <Stat label="Conversion-Rate" value={conversion === null ? "–" : pctFmt(Math.round(conversion * 10) / 10)} hint="Bezahlte Bestellungen pro Besucher" icon={Percent} accent="rose" />
        </Grid>
      )}
      <Card title="Umsatz pro Tag" description="Bezahlte Bestellungen nach Eingangstag.">
        <div className="flex h-44 items-end gap-[3px]" role="img" aria-label="Umsatz pro Tag">
          {c.series.map((p) => (
            <div key={p.date} className="group relative flex h-full flex-1 flex-col justify-end" title={`${formatDateShort(p.date)}: ${formatPrice(p.revenue)} (${p.orders})`}>
              <div className="rounded-t bg-[linear-gradient(180deg,#26b07a,#0f6b4a)]" style={{ height: p.revenue ? `${Math.max(4, (p.revenue / maxRev) * 100)}%` : "2px", opacity: p.revenue ? 1 : 0.25 }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[12px] text-[#5f5c56]"><span>{formatDateShort(c.series[0]?.date ?? d.from)}</span><span>{formatDateShort(d.to)}</span></div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Umsatz nach Kanal">
          <Bars rows={d.marketing.channels.slice(0, 8).map((r) => ({ label: r.label, v: r.revenue }))} format={formatPrice} />
        </Card>
        <Card title="Hinweise" icon={AlertTriangle}>
          {alerts.length ? <ul className="list-disc space-y-1.5 pl-5 text-[14px]">{alerts.map((a) => <li key={a}>{a}</li>)}</ul> : <p className="text-[14px] text-[#5f5c56]">Keine Auffälligkeiten.</p>}
        </Card>
      </div>
    </>
  );
}

function Marketing({ d, referrers }: { d: D; referrers: { x: string; y: number }[] | null }) {
  const m = d.marketing;
  // Umami referrers → channels, to compare visits with paid orders per channel.
  const visitsByChannel = new Map<string, number>();
  for (const r of referrers ?? []) {
    const host = r.x.replace(/^www\./, "");
    const ch = host ? classifyChannel("", host, "", new URLSearchParams()) : "direct";
    visitsByChannel.set(ch, (visitsByChannel.get(ch) ?? 0) + r.y);
  }
  return (
    <>
      <Banner tone="info">
        Kanal = woher der Besuch kam, der zur Bestellung geführt hat (letzter Nicht-Direkt-Kontakt, 30 Tage). Erfasst ab dem Tracking-Start: {pctFmt(m.trackedShare)} der bezahlten Bestellungen im Zeitraum haben einen Kanal.
      </Banner>
      <Card title="Kanäle" description="Umsatz, Bestellungen und Ø Bestellwert pro Kanal.">
        <RowTable rows={m.channels} first="Kanal" extra={referrers ? { head: "Besuche (Umami)", cell: (r) => visitsByChannel.get(r.key)?.toLocaleString("de-AT") ?? "–" } : undefined} />
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Verweisende Websites"><RowTable rows={m.referrers} first="Domain" /></Card>
        <Card title="Kampagnen (UTM)"><RowTable rows={m.campaigns} first="Quelle / Kampagne" empty="Noch keine Bestellungen mit UTM-Parametern." /></Card>
        <Card title="Einstiegsseiten"><RowTable rows={m.landings} first="Seite" /></Card>
        <Card title="Gutscheine">
          {m.coupons.length ? (
            <Table>
              <thead><tr><Th>Code</Th><Th className="text-right">Einlösungen</Th><Th className="text-right">Umsatz</Th><Th className="text-right">Rabatt</Th></tr></thead>
              <tbody>{m.coupons.map((c) => <tr key={c.key}><Td>{c.key}</Td><Td className="text-right tabular-nums">{c.orders}</Td><Td className="text-right tabular-nums">{formatPrice(c.revenue)}</Td><Td className="text-right tabular-nums">{formatPrice(c.discount)}</Td></tr>)}</tbody>
            </Table>
          ) : <EmptyState>Keine Gutscheine im Zeitraum eingelöst.</EmptyState>}
        </Card>
      </div>
      <Card title="„Wie hast du uns gefunden?“" description="Selbstauskunft der Kund:innen nach der Bestellung.">
        <Bars rows={m.foundVia.map((r) => ({ label: r.label, v: r.orders }))} color="#7c4ff0" />
      </Card>
    </>
  );
}

function Checkout({ d, events, visitors }: { d: D; events: { x: string; y: number }[] | null; visitors: number | null }) {
  const c = d.checkout;
  const count = new Map((events ?? []).map((e) => [e.x, e.y]));
  const funnel = FUNNEL.map((f) => ({ ...f, n: count.get(f.event) ?? 0 }));
  const top = Math.max(1, funnel[0]?.n ?? 0, ...funnel.map((f) => f.n));
  return (
    <>
      <Grid>
        <Stat label="Abgebrochene Kassen" value={c.abandonedCheckouts} hint="Kontaktdaten eingegeben, nicht bestellt" icon={ShoppingBag} accent="amber" />
        <Stat label="Bestellversuche" value={c.ordersCreated} hint={`${c.customersTried} Kund:in(nen)`} icon={CreditCard} accent="sky" />
        <Stat label="Bezahlt" value={c.paid} hint={`${c.customersPaid} Kund:in(nen)`} icon={BadgeEuro} accent="emerald" />
        <Stat label="Verloren" value={c.customersLost} hint={`Kund:innen ohne Zahlung · ${formatPrice(c.lostValue)}`} icon={AlertTriangle} accent="rose" />
      </Grid>
      {events && (
        <Card title="Trichter (Umami-Events)" description={`Anzahl Events im Zeitraum${visitors ? ` · ${visitors.toLocaleString("de-AT")} Besucher` : ""}. Nur Besuche mit Statistik-Zustimmung.`}>
          <ul className="space-y-2.5">
            {funnel.map((f, i) => (
              <li key={f.event} className="grid grid-cols-[minmax(0,12rem)_1fr_auto_auto] items-center gap-3 text-[13px]">
                <span>{f.label}</span>
                <span className="h-3 overflow-hidden rounded-full bg-[#f1ede6]" aria-hidden><span className="block h-full rounded-full bg-[#2f80d0]" style={{ width: `${Math.max(1, (f.n / top) * 100)}%` }} /></span>
                <span className="tabular-nums font-semibold">{f.n}</span>
                <span className="w-16 text-right tabular-nums text-[#5f5c56]">{i > 0 && funnel[i - 1].n ? pctFmt(Math.round((f.n / funnel[i - 1].n) * 1000) / 10) : ""}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Zahlarten" description="Versuche und Erfolg pro Zahlart.">
          {c.methods.length ? (
            <Table>
              <thead><tr><Th>Zahlart</Th><Th className="text-right">Versuche</Th><Th className="text-right">Bezahlt</Th><Th className="text-right">Nicht bezahlt</Th><Th className="text-right">Erfolg</Th></tr></thead>
              <tbody>{c.methods.map((m) => <tr key={m.method}><Td>{PAYMENT_LABELS[m.method as keyof typeof PAYMENT_LABELS] ?? m.method}</Td><Td className="text-right tabular-nums">{m.attempts}</Td><Td className="text-right tabular-nums">{m.paid}</Td><Td className="text-right tabular-nums">{m.failed}</Td><Td className="text-right tabular-nums">{pctFmt(m.success)}</Td></tr>)}</tbody>
            </Table>
          ) : <EmptyState>Keine Bestellversuche im Zeitraum.</EmptyState>}
        </Card>
        <Card title="Gründe für nicht bezahlte Bestellungen">
          <Bars rows={c.reasons.map((r) => ({ label: FAILURE_LABELS[r.code] ?? r.code, v: r.count }))} color="#d6406d" />
        </Card>
      </div>
    </>
  );
}

function I18n({ d, languages }: { d: D; languages: { x: string; y: number }[] | null }) {
  const withOrders = new Set(d.i18n.locales.map((l) => l.key));
  const silent = LIVE_LOCALES.filter((l) => !withOrders.has(l));
  const visits = new Map<string, number>();
  for (const l of languages ?? []) {
    const code = l.x.toLowerCase().split(/[-_]/)[0];
    const key = code === "nb" || code === "nn" ? "no" : ["bs", "hr", "sr"].includes(code) ? "bks" : code;
    visits.set(key, (visits.get(key) ?? 0) + l.y);
  }
  const rows = d.i18n.locales.map((r) => ({ ...r, label: langLabel(r.key) }));
  return (
    <>
      <Grid cols={3}>
        <Stat label="Sprachen mit Umsatz" value={d.i18n.locales.length} hint={`von ${LIVE_LOCALES.length} live`} icon={Globe} accent="sky" />
        <Stat label="Nicht-deutsch" value={pctFmt(d.i18n.nonGermanShare)} hint="Anteil bezahlter Bestellungen" icon={Globe} accent="violet" />
        <Stat label="Umsatz" value={formatPrice(d.ceo.revenue)} icon={BadgeEuro} accent="emerald" />
      </Grid>
      <Card title="Umsatz pro Shop-Sprache" description="Sprache, in der bestellt wurde.">
        <RowTable rows={rows} first="Sprache" extra={languages ? { head: "Besuche (Browser-Sprache)", cell: (r) => visits.get(r.key)?.toLocaleString("de-AT") ?? "–" } : undefined} />
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Zahlungserfolg pro Sprache">
          <Bars rows={d.i18n.paymentSuccess.map((p) => ({ label: `${langLabel(p.locale)} (${p.paid}/${p.attempts})`, v: p.success }))} format={pctFmt} color="#2f80d0" />
        </Card>
        <Card title="Live-Sprachen ohne Bestellung" description="Im gewählten Zeitraum.">
          {silent.length ? <p className="text-[14px] leading-relaxed">{silent.map(langLabel).join(", ")}</p> : <p className="text-[14px] text-[#5f5c56]">Jede Sprache hat Bestellungen.</p>}
        </Card>
      </div>
    </>
  );
}

function Products({ d }: { d: D }) {
  const p = d.products;
  return (
    <>
      <Card title="Produkte" description="Umsatz inkl. Extras, Rohertrag nach Floristen-Einkauf (netto). Ohne Einkaufspreis bleibt die Marge leer.">
        {p.items.length ? (
          <Table>
            <thead><tr><Th>Produkt</Th><Th className="text-right">Stück</Th><Th className="text-right">Umsatz</Th><Th className="text-right">Rohertrag</Th><Th className="text-right">Marge</Th></tr></thead>
            <tbody>{p.items.map((i) => (
              <tr key={i.id}><Td>{i.name}</Td><Td className="text-right tabular-nums">{i.qty}</Td><Td className="text-right tabular-nums">{formatPrice(i.revenue)}</Td>
                <Td className="text-right tabular-nums">{i.profit === null ? "–" : formatPrice(i.profit)}</Td>
                <Td className={cn("text-right tabular-nums", i.margin !== null && i.margin < 15 && "font-semibold text-[#c0392b]")}>{i.margin === null ? "–" : pctFmt(i.margin)}</Td></tr>
            ))}</tbody>
          </Table>
        ) : <EmptyState>Keine verkauften Produkte im Zeitraum.</EmptyState>}
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Größen"><Bars rows={p.sizes.map((s) => ({ label: s.label, v: s.qty }))} color="#d6406d" /></Card>
        <Card title="Extras" description={`${pctFmt(p.extrasAttachRate)} der Bestellungen mit mindestens einem Extra.`}>
          <Bars rows={p.extras.map((x) => ({ label: `${x.name} (${x.qty}×)`, v: x.revenue }))} format={formatPrice} color="#c27400" />
        </Card>
      </div>
    </>
  );
}

function Ops({ d }: { d: D }) {
  const o = d.ops;
  const accent: Accent = o.unconfirmed || o.unassigned ? "rose" : "emerald";
  return (
    <>
      <Grid>
        <Stat label="Pünktlich" value={o.delivered ? pctFmt(o.onTimeRate) : "–"} hint={`${o.delivered} zugestellt (+15 Min. Toleranz)`} icon={Clock} accent="emerald" />
        <Stat label="Partner-Bestätigung" value={o.medianConfirmMinutes === null ? "–" : `${Math.round(o.medianConfirmMinutes)} Min.`} hint="Median vom Senden bis zur Bestätigung" icon={Truck} accent="sky" />
        <Stat label="Offen ohne Bestätigung" value={o.unconfirmed + o.unassigned} hint={`${o.unconfirmed} unbestätigt · ${o.unassigned} ohne Partner`} icon={AlertTriangle} accent={accent} />
        <Stat label="Storniert / unzustellbar" value={o.cancelled + o.undeliverable} hint={`Ø Vorlauf ${o.medianLeadDays ?? 0} Tag(e) (Median)`} icon={ShoppingBag} accent="amber" />
      </Grid>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Lieferart"><Bars rows={o.types.map((t) => ({ label: t.label, v: t.orders }))} /></Card>
        <Card title="Verspätungen" description="Zustellung nach Ende des Zeitfensters."><Bars rows={o.delays.map((x) => ({ label: x.bucket, v: x.count }))} color="#e0532f" /></Card>
        <Card title="Liefertage"><Bars rows={o.byWeekday.map((w) => ({ label: w.label, v: w.count }))} color="#2f80d0" /></Card>
        <Card title="Zeitfenster"><Bars rows={o.windows.slice(0, 12).map((w) => ({ label: w.label, v: w.count }))} color="#7c4ff0" /></Card>
        <Card title="Partner"><Bars rows={o.partners.map((p) => ({ label: p.name, v: p.count }))} color="#0f8f8f" /></Card>
        <Card title="Zonen"><Bars rows={o.zones.map((z) => ({ label: z.label, v: z.orders }))} color="#c27400" /></Card>
      </div>
      <Card title="Bezirke" description="Bezahlte Bestellungen nach Empfänger-PLZ (Wien).">
        <RowTable rows={o.districts} first="Bezirk" />
      </Card>
    </>
  );
}

