import "server-only";
import type { Order } from "@/types";
import { getOrders } from "@/lib/cms";
import { markOrderPaid, markOrderPaymentFailed } from "@/lib/orders";
import { stripeConfigured, stripeIntentState } from "@/lib/payments";

/**
 * Unpaid orders that were left behind (card fields never filled, wallet sheet closed,
 * Klarna/EPS tab closed …) keep their stock reservation until something releases it.
 * `expireStaleOrders` marks every order whose payment is still `pending` two hours after
 * its last activity as failed – via `markOrderPaymentFailed`, which releases the stock
 * exactly once. A payment that still arrives later (webhook, return page) is applied by
 * `markOrderPaid`, which re-reserves the stock.
 *
 * Stripe orders are checked with Stripe first (when Stripe is configured): `succeeded`
 * → marked paid instead, `processing` → left alone. Paid, refunded or failed orders are
 * never touched. Runs from `/api/cron/stale-orders` (hourly) and the admin button.
 */

export const STALE_AFTER_MS = 2 * 60 * 60 * 1000;
export const STALE_NOTE = "Zahlung abgebrochen (nach 2 Std. automatisch)";

/** Newest timestamp of the order (creation or any history entry, e.g. a payment note). */
export function lastActivity(order: Pick<Order, "createdAt" | "history">): number {
  let latest = Date.parse(order.createdAt);
  for (const h of order.history ?? []) {
    const t = Date.parse(h.at);
    if (Number.isFinite(t) && t > latest) latest = t;
  }
  return latest;
}

/** Payment still pending and nothing happened for `maxAgeMs`. */
export function isStalePending(order: Order, now: number, maxAgeMs = STALE_AFTER_MS): boolean {
  if (order.payment.status !== "pending") return false;
  const at = lastActivity(order);
  return Number.isFinite(at) && now - at >= maxAgeMs;
}

export interface StaleDeps {
  getOrders: () => Promise<Order[]>;
  /** Raw PaymentIntent state, or null when Stripe cannot be asked (not configured). */
  intentState: (intentId: string) => Promise<{ status: string; reference?: string; orderId?: string } | null>;
  markPaid: typeof markOrderPaid;
  markFailed: typeof markOrderPaymentFailed;
}

const defaultDeps: StaleDeps = {
  getOrders,
  intentState: async (intentId) => (stripeConfigured() ? stripeIntentState(intentId) : null),
  markPaid: markOrderPaid,
  markFailed: markOrderPaymentFailed,
};

export interface StaleResult {
  checked: number;
  /** Marked failed, stock released. */
  expired: string[];
  /** Stripe said "succeeded" – marked paid instead. */
  confirmed: string[];
  /** Left pending this time (Stripe processing, Stripe not reachable). */
  skipped: { id: string; reason: string }[];
}

export async function expireStaleOrders(opts: { now?: number; maxAgeMs?: number } = {}, deps: StaleDeps = defaultDeps): Promise<StaleResult> {
  const now = opts.now ?? Date.now();
  const maxAge = opts.maxAgeMs ?? STALE_AFTER_MS;
  const stale = (await deps.getOrders()).filter((o) => isStalePending(o, now, maxAge));
  const result: StaleResult = { checked: stale.length, expired: [], confirmed: [], skipped: [] };

  for (const order of stale) {
    try {
      if (order.payment.provider === "stripe" && order.payment.intentId) {
        let state: Awaited<ReturnType<StaleDeps["intentState"]>>;
        try {
          state = await deps.intentState(order.payment.intentId);
        } catch (err) {
          // Unknown state – never release stock blindly; the next run tries again.
          console.error(`[stale-orders] Stripe lookup for ${order.id} failed`, err);
          result.skipped.push({ id: order.id, reason: "stripe_unreachable" });
          continue;
        }
        if (state && state.orderId && state.orderId !== order.id) {
          result.skipped.push({ id: order.id, reason: "intent_mismatch" });
          continue;
        }
        if (state?.status === "succeeded") {
          await deps.markPaid(order.id, { provider: "stripe", intentId: order.payment.intentId, reference: state.reference, note: "Zahlung nachträglich bestätigt (Stripe)" });
          result.confirmed.push(order.id);
          continue;
        }
        if (state?.status === "processing") {
          result.skipped.push({ id: order.id, reason: "processing" });
          continue;
        }
      }
      const updated = await deps.markFailed(order.id, { note: STALE_NOTE });
      if (updated?.payment.status === "failed") result.expired.push(order.id);
      else result.skipped.push({ id: order.id, reason: "changed" });
    } catch (err) {
      console.error(`[stale-orders] expiring ${order.id} failed`, err);
      result.skipped.push({ id: order.id, reason: "error" });
    }
  }
  return result;
}
