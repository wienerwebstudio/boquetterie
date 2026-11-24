import "server-only";
import type { Order, OrderAnalytics } from "@/types";
import { claimOnce, getOrderById, updateOrder } from "@/lib/cms";
import { sanitizeAttribution, sanitizeVisitorId, type Attribution } from "@/lib/attribution";
import { getLocalNow } from "@/lib/delivery";

/**
 * Server-side analytics events (Umami): `purchase`, `refund`, `order_delivered`, `order_delayed`,
 * `order_cancelled`. Sent from the payment backend / admin – never from the browser, so a reloaded
 * confirmation page cannot count a purchase twice.
 *
 * - Exactly once: every event claims its `order.analytics.<x>SentAt` before sending.
 * - Same visit: only orders with a `visitorId` (= the customer agreed to statistics) are sent, with
 *   that id as Umami's distinct id – Umami puts the event into the visitor's session, so revenue
 *   shows under the channel (ChatGPT, Google …) and language of that visit.
 * - Env-activated: needs NEXT_PUBLIC_UMAMI_WEBSITE_ID; without it (and in tests) nothing is sent.
 *   Never throws, never delays the caller beyond a short timeout.
 *
 * The admin dashboard (/admin/analytics) does not depend on this – it reads `order.analytics`
 * (channel of every order, with or without consent) directly.
 */

const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const SCRIPT = process.env.NEXT_PUBLIC_UMAMI_SRC || "https://cloud.umami.is/script.js";
const DOMAINS = process.env.NEXT_PUBLIC_UMAMI_DOMAINS;
const FALLBACK_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export type ServerEvent = "purchase" | "refund" | "order_delivered" | "order_delayed" | "order_cancelled";
type SentKey = "purchaseSentAt" | "refundSentAt" | "deliveredSentAt" | "cancelledSentAt";

/** Order analytics from the order request: attribution (always) + visitor id and browser (only with consent). */
export function orderAnalyticsFromRequest(input: unknown, userAgent: string | null): OrderAnalytics | undefined {
  const a = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const attribution: Attribution | undefined = sanitizeAttribution(a.attribution);
  const visitorId = sanitizeVisitorId(a.visitorId);
  if (!attribution && !visitorId) return undefined;
  return {
    channel: attribution?.channel ?? "direct",
    ...(attribution?.referrer_domain ? { referrerDomain: attribution.referrer_domain } : {}),
    ...(attribution?.utm_source ? { utmSource: attribution.utm_source } : {}),
    ...(attribution?.utm_medium ? { utmMedium: attribution.utm_medium } : {}),
    ...(attribution?.utm_campaign ? { utmCampaign: attribution.utm_campaign } : {}),
    ...(attribution?.landing ? { landing: attribution.landing } : {}),
    ...(visitorId ? { visitorId, ...(userAgent ? { userAgent: userAgent.slice(0, 300) } : {}) } : {}),
  };
}

/** "express" | "same_day" | "scheduled" | "none" – from the stored delivery. */
export function deliveryType(order: Pick<Order, "delivery" | "createdAt">): string {
  if (order.delivery.none) return "none";
  if (order.delivery.express) return "express";
  return order.delivery.date === getLocalNow("Europe/Vienna", new Date(order.createdAt)).date ? "same_day" : "scheduled";
}

/** Delivered within its window (+15 min grace)? Late deliveries also get a delay bucket. */
export function deliveryPunctuality(order: Pick<Order, "delivery">, deliveredAt: Date): { onTime: boolean; delayBucket?: string } {
  const { date, windowTo } = order.delivery;
  if (!windowTo) return { onTime: true };
  const now = getLocalNow("Europe/Vienna", deliveredAt);
  const [h, m] = windowTo.split(":").map(Number);
  const late = now.date > date ? 24 * 60 : now.date < date ? -1 : now.minutes - (h * 60 + m);
  if (late <= 15) return { onTime: true };
  const bucket = late <= 30 ? "15-30m" : late <= 60 ? "30-60m" : late <= 120 ? "1-2h" : "2h+";
  return { onTime: false, delayBucket: bucket };
}

function endpoint(): string {
  try {
    return `${new URL(SCRIPT).origin}/api/send`;
  } catch {
    return "https://cloud.umami.is/api/send";
  }
}

function hostname(): string {
  return (DOMAINS?.split(",")[0] || "blumora.at").trim();
}

/** Sends one event to Umami (best effort, 5 s timeout). Returns true when Umami accepted it. */
export async function sendUmamiEvent(order: Order, name: ServerEvent, data: Record<string, string | number | boolean>): Promise<boolean> {
  const a = order.analytics;
  if (!WEBSITE_ID || !a?.visitorId) return false;
  const locale = order.locale ?? "de";
  const body = {
    type: "event",
    payload: {
      website: WEBSITE_ID,
      hostname: hostname(),
      url: locale === "de" ? "/checkout" : `/${locale}/checkout`,
      language: locale,
      title: "Blumora",
      referrer: a.referrerDomain ? `https://${a.referrerDomain}/` : "",
      name,
      id: a.visitorId,
      data: { ...data, locale, channel: a.channel },
    },
  };
  try {
    const res = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": a.userAgent || FALLBACK_UA },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.warn(`[analytics] umami ${name} for ${order.id}: HTTP ${res.status}`);
    return res.ok;
  } catch (err) {
    console.warn(`[analytics] umami ${name} for ${order.id} failed`, err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Claims `key` for the order – exactly once across webhook + confirm + retries, also when two
 * server instances run at the same time (atomic `claimOnce`). Returns the order when this call won;
 * the time is also kept on the order (`analytics.<key>`) for the admin.
 */
async function claim(orderId: string, key: SentKey): Promise<Order | null> {
  const order = await getOrderById(orderId);
  if (!order?.analytics?.visitorId || order.analytics[key]) return null;
  if (!(await claimOnce(`analytics-${orderId}-${key}`))) return null;
  return updateOrder(orderId, (o) => (o.analytics ? { ...o, analytics: { ...o.analytics, [key]: new Date().toISOString() } } : o));
}

async function claimAndSend(orderId: string, key: SentKey, build: (o: Order) => { name: ServerEvent; data: Record<string, string | number | boolean> }[]) {
  if (!WEBSITE_ID) return;
  try {
    const order = await claim(orderId, key);
    if (!order) return;
    for (const e of build(order)) await sendUmamiEvent(order, e.name, e.data);
  } catch (err) {
    console.error(`[analytics] ${key} for ${orderId} failed`, err);
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Payment confirmed (markOrderPaid). Revenue = the charged total, EUR. */
export function trackPurchase(orderId: string) {
  return claimAndSend(orderId, "purchaseSentAt", (o) => [{
    name: "purchase",
    data: {
      revenue: round2(o.totals.total),
      currency: "EUR",
      payment_method: o.payment.method,
      delivery_type: deliveryType(o),
      delivery_zone: o.delivery.zoneId,
      item_count: o.lines.reduce((s, l) => s + l.quantity, 0),
      order_type: o.offerId ? "offer" : "shop",
      coupon: Boolean(o.coupon),
    },
  }]);
}

/** Refund reported by the provider (markOrderRefunded). Full refund = the order total. */
export function trackRefund(orderId: string, reasonCode = "provider_refund") {
  return claimAndSend(orderId, "refundSentAt", (o) => [{
    name: "refund",
    data: { refund_value: round2(o.totals.total), currency: "EUR", reason_code: reasonCode, payment_method: o.payment.method },
  }]);
}

/** Admin set "Zugestellt": order_delivered (+ order_delayed when after the window). */
export function trackDelivered(orderId: string, at = new Date()) {
  return claimAndSend(orderId, "deliveredSentAt", (o) => {
    const p = deliveryPunctuality(o, at);
    const events: { name: ServerEvent; data: Record<string, string | number | boolean> }[] = [
      { name: "order_delivered", data: { delivery_type: deliveryType(o), on_time: p.onTime, delivery_zone: o.delivery.zoneId } },
    ];
    if (p.delayBucket) events.push({ name: "order_delayed", data: { delay_bucket: p.delayBucket, delivery_zone: o.delivery.zoneId } });
    return events;
  });
}

/** Admin set "Storniert". */
export function trackCancelled(orderId: string, reasonCode = "admin") {
  return claimAndSend(orderId, "cancelledSentAt", (o) => [{
    name: "order_cancelled",
    data: { reason_code: reasonCode, payment_status: o.payment.status },
  }]);
}

/** For tests / admin: is the order's purchase already reported? */
export async function purchaseReported(orderId: string) {
  return Boolean((await getOrderById(orderId))?.analytics?.purchaseSentAt);
}
