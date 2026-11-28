import type { CheckoutDraft, Order } from "@/types";
import { CHANNEL_LABELS, type Channel } from "@/lib/attribution";
import { getLocalNow } from "@/lib/delivery";
import { deliveredAt, deliveryPunctuality, deliveryType, lineCost, lineRevenue, orderCost, paymentFailureCode } from "@/lib/order-metrics";

/**
 * Figures for the six dashboards under /admin/analytics, computed from the shop's own data
 * (orders, checkout drafts, florist budgets). Pure – unit tested in tests/unit/analytics-dashboard.test.ts.
 * Traffic and the event funnel come from Umami separately (src/lib/umami-api.ts) and are optional.
 *
 * Conventions: the period filters by the order's creation day (Vienna). Revenue = paid orders
 * (refunded ones count as refunds, not revenue). Test payments (mock) are left out. "Rohertrag" =
 * revenue − florist purchase price (net) – before courier, Stripe fees and VAT.
 */

const TZ = "Europe/Vienna";

export interface DashboardInput {
  orders: Order[];
  drafts?: CheckoutDraft[];
  /** Today in Vienna ("YYYY-MM-DD"). */
  today: string;
  /** Number of days in the period (incl. today); null = all time. */
  days: number | null;
}

export interface Row { key: string; label: string; orders: number; revenue: number; share: number; aov: number }
export interface Point { date: string; orders: number; revenue: number }

const round2 = (n: number) => Math.round(n * 100) / 100;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const localDate = (iso: string) => getLocalNow(TZ, new Date(iso)).date;
export function shiftDate(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10);
}
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Mock/test payments never count. */
const isTest = (o: Order) => o.payment.provider === "mock" || /^MOCK/i.test(o.payment.reference ?? "");

function group<K extends string>(orders: Order[], keyOf: (o: Order) => K, labelOf: (k: K) => string): Row[] {
  const map = new Map<K, { orders: number; revenue: number }>();
  for (const o of orders) {
    const k = keyOf(o);
    const g = map.get(k) ?? { orders: 0, revenue: 0 };
    g.orders += 1;
    g.revenue += o.totals.total;
    map.set(k, g);
  }
  const total = orders.reduce((s, o) => s + o.totals.total, 0);
  return [...map.entries()]
    .map(([key, g]) => ({ key, label: labelOf(key), orders: g.orders, revenue: round2(g.revenue), share: pct(g.revenue, total), aov: round2(g.revenue / g.orders) }))
    .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);
}

export function channelLabel(key: string) {
  return key === "unknown" ? "Unbekannt (vor dem Tracking)" : CHANNEL_LABELS[key as Channel] ?? key;
}

export function buildDashboard({ orders: all, drafts = [], today, days }: DashboardInput) {
  const from = days ? shiftDate(today, -(days - 1)) : "0000-01-01";
  const inPeriod = all.filter((o) => !isTest(o) && localDate(o.createdAt) >= from && localDate(o.createdAt) <= today);
  const paid = inPeriod.filter((o) => o.payment.status === "paid");
  const refunded = inPeriod.filter((o) => o.payment.status === "refunded");
  const unpaid = inPeriod.filter((o) => o.payment.status === "failed" || o.payment.status === "pending");

  const revenue = round2(paid.reduce((s, o) => s + o.totals.total, 0));
  const costs = paid.map(orderCost);
  const cost = round2(costs.reduce((s, c) => s + c.cost, 0));
  const withCost = paid.filter((_, i) => costs[i].complete);
  const revenueWithCost = withCost.reduce((s, o) => s + o.totals.total, 0);
  const costWithCost = withCost.reduce((s, o) => s + orderCost(o).cost, 0);
  const grossProfit = round2(revenueWithCost - costWithCost);

  /* ---- Daily series ---- */
  const seriesDays = days ?? Math.max(1, Math.min(120, Math.round((Date.parse(today) - Date.parse(inPeriod.reduce((m, o) => (localDate(o.createdAt) < m ? localDate(o.createdAt) : m), today))) / 86_400_000) + 1));
  const series: Point[] = Array.from({ length: seriesDays }, (_, i) => ({ date: shiftDate(today, -(seriesDays - 1 - i)), orders: 0, revenue: 0 }));
  const byDate = new Map(series.map((p) => [p.date, p]));
  for (const o of paid) {
    const p = byDate.get(localDate(o.createdAt));
    if (p) { p.orders += 1; p.revenue = round2(p.revenue + o.totals.total); }
  }

  /* ---- 1 CEO ---- */
  const ceo = {
    revenue,
    paidOrders: paid.length,
    aov: paid.length ? round2(revenue / paid.length) : 0,
    cost,
    grossProfit,
    grossMargin: pct(grossProfit, revenueWithCost),
    ordersWithoutCost: paid.length - withCost.length,
    refunds: round2(refunded.reduce((s, o) => s + o.totals.total, 0)),
    refundedOrders: refunded.length,
    attempts: inPeriod.length,
    paymentSuccess: pct(paid.length + refunded.length, inPeriod.length),
    deliveryFees: round2(paid.reduce((s, o) => s + o.totals.delivery, 0)),
    discounts: round2(paid.reduce((s, o) => s + o.totals.discount, 0)),
    series,
  };

  /* ---- 2 Marketing & attribution ---- */
  const channelOf = (o: Order) => (o.analytics?.channel ?? "unknown") as string;
  const marketing = {
    channels: group(paid, channelOf, channelLabel),
    trackedShare: pct(paid.filter((o) => o.analytics).length, paid.length),
    referrers: group(paid.filter((o) => o.analytics?.referrerDomain), (o) => o.analytics!.referrerDomain!, (k) => k).slice(0, 10),
    campaigns: group(paid.filter((o) => o.analytics?.utmCampaign || o.analytics?.utmSource), (o) => `${o.analytics!.utmSource ?? "–"} / ${o.analytics!.utmCampaign ?? "–"}`, (k) => k).slice(0, 10),
    landings: group(paid.filter((o) => o.analytics?.landing), (o) => o.analytics!.landing!, (k) => k).slice(0, 10),
    coupons: group(paid.filter((o) => o.coupon), (o) => o.coupon!.code.toUpperCase(), (k) => k).map((r) => ({
      ...r, discount: round2(paid.filter((o) => o.coupon?.code.toUpperCase() === r.key).reduce((s, o) => s + o.totals.discount, 0)),
    })),
    foundVia: group(paid.filter((o) => o.foundVia), (o) => o.foundVia!.source, (k) => k),
  };

  /* ---- 3 Checkout & conversion ---- */
  const methods = new Map<string, { attempts: number; paid: number; failed: number }>();
  for (const o of inPeriod) {
    const m = methods.get(o.payment.method) ?? { attempts: 0, paid: 0, failed: 0 };
    m.attempts += 1;
    if (o.payment.status === "paid" || o.payment.status === "refunded") m.paid += 1; else m.failed += 1;
    methods.set(o.payment.method, m);
  }
  const reasons = new Map<string, number>();
  for (const o of unpaid) {
    const r = paymentFailureCode(o) ?? "unknown";
    reasons.set(r, (reasons.get(r) ?? 0) + 1);
  }
  const draftsInPeriod = drafts.filter((d) => localDate(d.createdAt) >= from && localDate(d.createdAt) <= today);
  // A customer who tried several times counts once ("people", not attempts): by e-mail.
  const people = (list: Order[]) => new Set(list.map((o) => o.customer.email.toLowerCase())).size;
  const paidPeople = new Set(paid.concat(refunded).map((o) => o.customer.email.toLowerCase()));
  const lostPeople = new Set(unpaid.map((o) => o.customer.email.toLowerCase()).filter((e) => !paidPeople.has(e)));
  const checkout = {
    abandonedCheckouts: draftsInPeriod.length,
    ordersCreated: inPeriod.length,
    paid: paid.length + refunded.length,
    customersTried: people(inPeriod),
    customersPaid: paidPeople.size,
    customersLost: lostPeople.size,
    lostValue: round2(unpaid.filter((o) => lostPeople.has(o.customer.email.toLowerCase())).reduce((m, o) => m + o.totals.total, 0)),
    methods: [...methods.entries()].map(([method, m]) => ({ method, ...m, success: pct(m.paid, m.attempts) })).sort((a, b) => b.attempts - a.attempts),
    reasons: [...reasons.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count),
  };

  /* ---- 4 Internationalisation ---- */
  const localeOf = (o: Order) => o.locale ?? "de";
  const byLocale = group(paid, localeOf, (k) => k);
  const attemptsByLocale = new Map<string, { attempts: number; paid: number }>();
  for (const o of inPeriod) {
    const k = localeOf(o);
    const a = attemptsByLocale.get(k) ?? { attempts: 0, paid: 0 };
    a.attempts += 1;
    if (o.payment.status === "paid" || o.payment.status === "refunded") a.paid += 1;
    attemptsByLocale.set(k, a);
  }
  const i18n = {
    locales: byLocale,
    nonGermanShare: pct(paid.filter((o) => localeOf(o) !== "de").length, paid.length),
    paymentSuccess: [...attemptsByLocale.entries()].map(([locale, a]) => ({ locale, ...a, success: pct(a.paid, a.attempts) })).sort((a, b) => b.attempts - a.attempts),
  };

  /* ---- 5 Products ---- */
  const prod = new Map<string, { name: string; qty: number; revenue: number; cost: number; costKnown: boolean }>();
  const sizes = new Map<string, number>();
  const extras = new Map<string, { name: string; qty: number; revenue: number }>();
  let ordersWithExtras = 0;
  for (const o of paid) {
    if (o.lines.some((l) => l.extras.length)) ordersWithExtras += 1;
    for (const l of o.lines) {
      const key = l.custom ? "custom" : l.productId;
      const p = prod.get(key) ?? { name: l.custom ? "Individuelle Angebote" : l.productName, qty: 0, revenue: 0, cost: 0, costKnown: true };
      p.qty += l.quantity;
      p.revenue += lineRevenue(l);
      const c = lineCost(l);
      if (c === undefined) p.costKnown = false; else p.cost += c;
      prod.set(key, p);
      if (!l.custom) sizes.set(l.sizeLabel, (sizes.get(l.sizeLabel) ?? 0) + l.quantity);
      for (const e of l.extras) {
        const x = extras.get(e.extraId) ?? { name: e.name, qty: 0, revenue: 0 };
        x.qty += e.quantity;
        x.revenue += e.unitPrice * e.quantity;
        extras.set(e.extraId, x);
      }
    }
  }
  const products = {
    items: [...prod.entries()].map(([id, p]) => ({
      id, name: p.name, qty: p.qty, revenue: round2(p.revenue),
      profit: p.costKnown ? round2(p.revenue - p.cost) : null,
      margin: p.costKnown ? pct(p.revenue - p.cost, p.revenue) : null,
    })).sort((a, b) => b.revenue - a.revenue),
    sizes: [...sizes.entries()].map(([label, qty]) => ({ label, qty })).sort((a, b) => b.qty - a.qty),
    extras: [...extras.entries()].map(([id, x]) => ({ id, name: x.name, qty: x.qty, revenue: round2(x.revenue) })).sort((a, b) => b.revenue - a.revenue),
    extrasAttachRate: pct(ordersWithExtras, paid.length),
  };

  /* ---- 6 Delivery & operations ---- */
  const live = paid.concat(inPeriod.filter((o) => o.status === "cancelled" || o.status === "undeliverable"));
  const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const byWeekday = weekdays.map((label, i) => ({ label, count: paid.filter((o) => new Date(`${o.delivery.date}T12:00:00Z`).getUTCDay() === i).length }));
  const windows = new Map<string, number>();
  for (const o of paid) if (o.delivery.windowLabel) windows.set(o.delivery.windowLabel, (windows.get(o.delivery.windowLabel) ?? 0) + 1);
  const delivered = paid.filter((o) => o.status === "delivered" && deliveredAt(o));
  const punctual = delivered.map((o) => deliveryPunctuality(o, deliveredAt(o)!));
  const confirmMinutes = paid
    .filter((o) => o.partner?.sentAt && o.partner.confirmedAt)
    .map((o) => (Date.parse(o.partner!.confirmedAt!) - Date.parse(o.partner!.sentAt!)) / 60_000)
    .filter((m) => m >= 0);
  const partners = new Map<string, number>();
  for (const o of paid) partners.set(o.partner?.name ?? "Nicht zugeordnet", (partners.get(o.partner?.name ?? "Nicht zugeordnet") ?? 0) + 1);
  const leadDays = paid.map((o) => Math.max(0, Math.round((Date.parse(o.delivery.date) - Date.parse(localDate(o.createdAt))) / 86_400_000)));
  const ops = {
    zones: group(paid, (o) => o.delivery.zoneName || o.delivery.zoneId, (k) => k),
    districts: group(paid.filter((o) => /^1\d\d0$/.test(o.recipient.zip)), (o) => o.recipient.zip, (k) => `${Number(k.slice(1, 3))}. Bezirk (${k})`),
    types: group(paid, (o) => deliveryType(o), (k) => ({ express: "Express", same_day: "Same Day", scheduled: "Mit Vorlauf", none: "Ohne Lieferung" }[k] ?? k)),
    byWeekday,
    windows: [...windows.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    delivered: delivered.length,
    onTimeRate: pct(punctual.filter((p) => p.onTime).length, punctual.length),
    delays: ["15-30m", "30-60m", "1-2h", "2h+"].map((b) => ({ bucket: b, count: punctual.filter((p) => p.delayBucket === b).length })),
    medianConfirmMinutes: median(confirmMinutes),
    unconfirmed: paid.filter((o) => o.partner?.sentAt && !o.partner.confirmedAt && !["delivered", "cancelled"].includes(o.status)).length,
    unassigned: paid.filter((o) => !o.partner && !["delivered", "cancelled"].includes(o.status)).length,
    cancelled: live.filter((o) => o.status === "cancelled").length,
    undeliverable: live.filter((o) => o.status === "undeliverable").length,
    partners: [...partners.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    medianLeadDays: median(leadDays),
  };

  return { from, to: today, ceo, marketing, checkout, i18n, products, ops };
}

export type Dashboard = ReturnType<typeof buildDashboard>;
