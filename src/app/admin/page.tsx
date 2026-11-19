import Link from "next/link";
import {
  ArrowUpRight, BarChart3, CalendarOff, Clock, Compass, Flower2, Mail, MailCheck, PanelsTopLeft, Plus, ShoppingBag, Ticket, Truck, Zap,
} from "lucide-react";
import { FOUND_VIA_OPTIONS } from "@/lib/found-via";
import { getAllProducts, getNewsletterSubscribers, getOrders, getSettings } from "@/lib/cms";
import { getLocalNow } from "@/lib/delivery";
import { cn, formatDateShort, formatDateTime, formatPrice } from "@/lib/format";
import { Banner, Card, EmptyState, Stat, Table, Td, Th, type Accent } from "@/components/admin/controls";
import { StatusBadge } from "@/components/admin/status-badge";
import { TestMailButton } from "@/components/admin/test-mail-button";
import { customerName, isOpenOrder, localDateOf, statusLabel } from "@/components/admin/order-utils";

export const dynamic = "force-dynamic";

const QUICK_LINKS: { href: string; label: string; icon: typeof Plus; accent: Accent }[] = [
  { href: "/admin/produkte/neu", label: "Neues Produkt anlegen", icon: Plus, accent: "rose" },
  { href: "/admin/bestellungen?status=open", label: "Offene Bestellungen", icon: ShoppingBag, accent: "emerald" },
  { href: "/admin/einstellungen", label: "Ankündigung & Sperrtage", icon: CalendarOff, accent: "sky" },
  { href: "/admin/liefergebiete", label: "Liefergebiete & Fristen", icon: Truck, accent: "amber" },
  { href: "/admin/gutscheine/neu", label: "Gutschein erstellen", icon: Ticket, accent: "coral" },
  { href: "/admin/startseite", label: "Startseite bearbeiten", icon: PanelsTopLeft, accent: "violet" },
];

/** Bar colours for the "found via" breakdown, in order of the ranking. */
const FOUND_VIA_COLORS = ["#7c4ff0", "#d6406d", "#2f80d0", "#0f8f8f", "#e0532f", "#c27400", "#0f9466", "#4a5160"];

/** Solid dot colour per status (matches the status chips). */
const STATUS_DOT: Record<string, string> = {
  received: "#2f80d0", paid: "#0f9466", preparing: "#c27400", arranging: "#7c4ff0", ready: "#0f8f8f",
  in_transit: "#e0532f", delivered: "#1f6a4a", undeliverable: "#c0392b", cancelled: "#9aa1ad",
};

const CHART_DAYS = 14;

/** "YYYY-MM-DD" n days before `date`. */
function shiftDate(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - days, 12)).toISOString().slice(0, 10);
}
function weekdayShort(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("de-AT", { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d, 12))).replace(".", "");
}

export default async function AdminOverviewPage() {
  const [orders, products, subscribers, settings] = await Promise.all([
    getOrders(), getAllProducts(true), getNewsletterSubscribers(), getSettings(),
  ]);
  const now = getLocalNow(settings.timezone);
  const ordersToday = orders.filter((o) => localDateOf(o.createdAt, settings.timezone) === now.date);
  const openOrders = orders.filter((o) => isOpenOrder(o, settings));
  const deliveriesToday = orders.filter((o) => o.delivery.date === now.date && isOpenOrder(o, settings));
  const latest = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const answered = orders.filter((o) => o.foundVia);
  const foundViaTotal = answered.length;
  const foundViaCounts = FOUND_VIA_OPTIONS.map((opt) => ({ ...opt, count: answered.filter((o) => o.foundVia?.source === opt.id).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  const foundViaOther = answered.map((o) => o.foundVia?.other).filter((v): v is string => Boolean(v)).slice(-10);
  const placeholders = [settings.brand.legalName, settings.brand.email, settings.brand.phone, settings.brand.address.street].filter((v) => v.startsWith("[")).length;
  const activeProducts = products.filter((p) => p.active).length;
  const confirmedSubscribers = subscribers.filter((s) => s.status === "confirmed").length;

  // Orders per day (shop timezone) over the last CHART_DAYS days, from the existing orders.
  const days = Array.from({ length: CHART_DAYS }, (_, i) => shiftDate(now.date, CHART_DAYS - 1 - i));
  const byDay = new Map(days.map((d) => [d, { count: 0, paid: 0 }]));
  for (const o of orders) {
    const bucket = byDay.get(localDateOf(o.createdAt, settings.timezone));
    if (!bucket) continue;
    bucket.count += 1;
    if (o.payment.status === "paid") bucket.paid += o.totals.total;
  }
  const series = days.map((d) => ({ date: d, ...byDay.get(d)! }));
  const maxCount = Math.max(1, ...series.map((s) => s.count));
  const periodCount = series.reduce((s, d) => s + d.count, 0);
  const periodPaid = series.reduce((s, d) => s + d.paid, 0);

  // Open orders by status.
  const openByStatus = settings.orderStatuses
    .map((s) => ({ key: s.key, label: s.label, count: openOrders.filter((o) => o.status === s.key).length }))
    .filter((s) => s.count > 0);

  return (
    <>
      {/* Hero */}
      <section className="relative mb-7 overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#17301f_0%,#1f4a37_45%,#0f6b6b_100%)] px-6 py-7 text-white shadow-[0_20px_40px_-24px_rgba(15,107,107,0.8)] sm:px-8">
        <span className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-[#d6406d]/35 blur-3xl" aria-hidden />
        <span className="pointer-events-none absolute -bottom-20 right-40 size-56 rounded-full bg-[#f0a020]/25 blur-3xl" aria-hidden />
        <svg className="pointer-events-none absolute -right-14 -top-14 hidden size-52 rotate-12 text-white/[0.07] sm:block" viewBox="0 0 100 100" aria-hidden>
          {[0, 60, 120, 180, 240, 300].map((r) => (
            <ellipse key={r} cx="50" cy="28" rx="13" ry="22" fill="currentColor" transform={`rotate(${r} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="9" fill="currentColor" />
        </svg>
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-[30px] font-bold leading-tight tracking-tight text-white">Übersicht</h1>
            <p className="mt-1 text-[14px] text-[#d6e8de]">Stand {formatDateShort(now.date)} – Zeitzone {settings.timezone}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-[13px] font-semibold text-white ring-1 ring-white/20 backdrop-blur">
              <Truck className="size-4 text-[#fbd27a]" aria-hidden /> {deliveriesToday.length} Lieferung(en) heute
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-[13px] font-semibold text-white ring-1 ring-white/20 backdrop-blur">
              <Clock className="size-4 text-[#9ccbfa]" aria-hidden /> {openOrders.length} offen
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Bestellungen heute" value={ordersToday.length} hint="Eingegangen seit Mitternacht" href="/admin/bestellungen" icon={ShoppingBag} accent="sky" />
        <Stat label="Offene Bestellungen" value={openOrders.length} hint={`${deliveriesToday.length} Lieferung(en) heute`} href="/admin/bestellungen?status=open" icon={Clock} accent="amber" />
        <Stat label="Aktive Produkte" value={activeProducts} hint={`${products.length} gesamt`} href="/admin/produkte" icon={Flower2} accent="rose">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#fde8ee]" aria-hidden>
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#f8a9c1,#d6406d)]" style={{ width: `${products.length ? Math.round((activeProducts / products.length) * 100) : 0}%` }} />
          </div>
        </Stat>
        <Stat label="Newsletter" value={confirmedSubscribers} hint={`bestätigt · ${subscribers.length - confirmedSubscribers} offen`} href="/admin/newsletter" icon={Mail} accent="violet" />
      </div>

      {placeholders > 0 && (
        <Banner tone="warn" className="mt-4">
          {placeholders} Angabe(n) zu Firma/Kontakt sind noch Platzhalter. <Link href="/admin/einstellungen" className="font-semibold underline underline-offset-4">Jetzt in den Einstellungen ergänzen</Link>.
        </Banner>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          <Card
            title={`Bestellungen der letzten ${CHART_DAYS} Tage`}
            description="Eingänge pro Tag (Shop-Zeitzone)."
            accent="sky"
            icon={BarChart3}
            actions={
              <dl className="flex gap-5 text-right">
                <div>
                  <dt className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#4f4c47]">Bestellungen</dt>
                  <dd className="text-[20px] font-bold tabular-nums text-ink">{periodCount}</dd>
                </div>
                <div>
                  <dt className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#4f4c47]">Umsatz (bezahlt)</dt>
                  <dd className="text-[20px] font-bold tabular-nums text-[#175c9c]">{formatPrice(periodPaid)}</dd>
                </div>
              </dl>
            }
          >
            <div
              role="img"
              aria-label={`Bestellungen pro Tag: ${series.map((s) => `${formatDateShort(s.date)} ${s.count}`).join(", ")}`}
              className="relative"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[repeating-linear-gradient(180deg,#efebe4_0,#efebe4_1px,transparent_1px,transparent_32px)]" aria-hidden />
              <div className="relative flex h-32 items-end gap-1.5 sm:gap-2">
                {series.map((s, i) => {
                  const isToday = s.date === now.date;
                  return (
                    <div key={s.date} className="group relative flex h-full flex-1 flex-col justify-end" title={`${formatDateShort(s.date)}: ${s.count} Bestellung(en)`}>
                      {s.count > 0 && <span className="mb-1 text-center text-[11px] font-semibold tabular-nums text-[#175c9c]">{s.count}</span>}
                      <div
                        className={cn(
                          "bl-bar w-full rounded-t-md transition-[filter] group-hover:brightness-110",
                          s.count === 0 ? "bg-[#e4f1fd]" : isToday ? "bg-[linear-gradient(180deg,#f8a9c1,#d6406d)]" : "bg-[linear-gradient(180deg,#9ccbfa,#2f80d0)]",
                        )}
                        style={{ height: s.count === 0 ? "4px" : `${Math.max(10, (s.count / maxCount) * 100)}%`, animationDelay: `${i * 25}ms` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-1.5 sm:gap-2" aria-hidden>
                {series.map((s, i) => (
                  <span key={s.date} className={cn("flex-1 text-center text-[10.5px] text-[#5f5c56]", s.date === now.date && "font-bold text-[#a92a52]", i % 2 === 1 && s.date !== now.date && "max-sm:invisible")}>
                    {s.date === now.date ? "Heute" : weekdayShort(s.date)}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[16px] font-semibold">
                <span className="h-5 w-1 rounded-full bg-[linear-gradient(180deg,#7ee2b8,#0f9466)]" aria-hidden />
                Neueste Bestellungen
              </h2>
              <Link href="/admin/bestellungen" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#0a6644] underline-offset-4 hover:underline">
                Alle anzeigen <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
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
                    <tr key={o.id}>
                      <Td className="whitespace-nowrap"><Link href={`/admin/bestellungen/${o.id}`} className="font-semibold text-[#0a6644] underline-offset-4 hover:underline">{o.id}</Link></Td>
                      <Td className="whitespace-nowrap text-[#5f5c56]">{formatDateTime(o.createdAt)}</Td>
                      <Td>{customerName(o)}</Td>
                      <Td className="whitespace-nowrap">{formatDateShort(o.delivery.date)}{o.delivery.windowLabel ? ` · ${o.delivery.windowLabel}` : ""}</Td>
                      <Td><StatusBadge status={o.status} label={statusLabel(settings, o.status)} /></Td>
                      <Td className="whitespace-nowrap text-right font-semibold tabular-nums">{formatPrice(o.totals.total)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 content-start gap-6">
          <Card title="Schnellzugriff" accent="emerald" icon={Zap}>
            <ul className="-mx-2 -my-1 space-y-0.5">
              {QUICK_LINKS.map((l) => {
                const Icon = l.icon;
                return (
                  <li key={l.href} data-accent={l.accent}>
                    <Link href={l.href} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 text-[14px] font-medium text-ink transition-colors hover:bg-[#f6f4ef]">
                      <span className="bl-tile flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="flex-1">{l.label}</span>
                      <ArrowUpRight className="bl-acc-text size-4 opacity-40 transition-opacity group-hover:opacity-100" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="Offen nach Status" accent="amber" icon={Clock}>
            {openByStatus.length === 0 ? (
              <p className="text-[14px] text-[#5f5c56]">Keine offenen Bestellungen.</p>
            ) : (
              <>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-[#f3efe8]" aria-hidden>
                  {openByStatus.map((s) => (
                    <div key={s.key} style={{ width: `${(s.count / openOrders.length) * 100}%`, background: STATUS_DOT[s.key] ?? "#9aa1ad" }} />
                  ))}
                </div>
                <ul className="mt-4 space-y-2 text-[14px]">
                  {openByStatus.map((s) => (
                    <li key={s.key} className="flex items-center justify-between gap-3">
                      <StatusBadge status={s.key} label={s.label} />
                      <span className="font-semibold tabular-nums text-ink">{s.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <Card title="Wie Kund:innen uns finden" description="Antworten aus der Bewertungsmail bzw. dem Bewertungsformular." accent="violet" icon={Compass}>
            {foundViaTotal === 0 ? (
              <p className="text-[14px] text-[#5f5c56]">Noch keine Antworten.</p>
            ) : (
              <ul className="space-y-3 text-[14px]">
                {foundViaCounts.map((c, i) => {
                  const pct = Math.round((c.count / foundViaTotal) * 100);
                  return (
                    <li key={c.id}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-ink">{c.label}</span>
                        <span className="tabular-nums text-[#5f5c56]">{c.count} · {pct} %</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f3efe8]" aria-hidden>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: FOUND_VIA_COLORS[i % FOUND_VIA_COLORS.length] }} />
                      </div>
                    </li>
                  );
                })}
                {foundViaOther.length > 0 && <li className="pt-1 text-[12.5px] text-ink-soft">Sonstiges: {foundViaOther.join(", ")}</li>}
              </ul>
            )}
          </Card>

          <Card title="E-Mails testen" accent="coral" icon={MailCheck}>
            <TestMailButton defaultRecipient={process.env.MAIL_REDIRECT_TO?.trim() || process.env.MAIL_ADMIN?.trim() || ""} />
          </Card>
        </div>
      </div>
    </>
  );
}
