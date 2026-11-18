import type { Order, Partner } from "@/types";
import { getLocalNow } from "@/lib/delivery";

/**
 * Reminders for partner florists that have not confirmed an order slip yet.
 *
 * The clock only runs while the partner is open: a slip sent at midnight to a shop
 * that opens at 07:30 is reminded at 08:00, not every half hour through the night.
 * After MAX_PARTNER_REMINDERS reminders the team is told to call – no more mails.
 */
export const REMINDER_AFTER_OPEN_MINUTES = 30;
export const MAX_PARTNER_REMINDERS = 2;
const STEP_MINUTES = 5;
const MAX_LOOKAHEAD_DAYS = 14;

export type OpeningHours = Pick<Partner, "openFrom" | "openTo" | "openDays">;

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Is the partner open at `at`? Without opening hours: always. */
export function isPartnerOpen(hours: OpeningHours, at: Date, timezone = "Europe/Vienna"): boolean {
  const local = getLocalNow(timezone, at);
  if (hours.openDays && hours.openDays.length && !hours.openDays.includes(local.weekday)) return false;
  if (!hours.openFrom || !hours.openTo) return true;
  return local.minutes >= toMinutes(hours.openFrom) && local.minutes < toMinutes(hours.openTo);
}

/** The moment `minutes` opening minutes after `from` have passed (5-minute steps). */
export function addOpenMinutes(from: Date, minutes: number, hours: OpeningHours, timezone = "Europe/Vienna"): Date {
  let t = from.getTime();
  let open = 0;
  const limit = t + MAX_LOOKAHEAD_DAYS * 24 * 60 * 60_000;
  while (open < minutes && t < limit) {
    if (isPartnerOpen(hours, new Date(t), timezone)) open += STEP_MINUTES;
    t += STEP_MINUTES * 60_000;
  }
  return new Date(t);
}

/** Reminders already sent for the current slip. */
export const remindersSent = (order: Order) => order.partner?.reminders?.length ?? 0;

/**
 * When the next reminder for this order is due – or null when none is (confirmed,
 * cancelled, delivered, past the delivery day, no confirm link, or all reminders sent).
 */
export function nextPartnerReminderAt(order: Order, hours: OpeningHours, todayLocal: string, timezone = "Europe/Vienna"): Date | null {
  const p = order.partner;
  if (!p?.sentAt || !p.confirmToken || p.confirmedAt || p.cancelSentAt) return null;
  if (order.payment.status !== "paid" || order.status === "cancelled" || order.status === "delivered") return null;
  if (order.delivery.date < todayLocal) return null;
  const sent = remindersSent(order);
  if (sent >= MAX_PARTNER_REMINDERS) return null;
  const last = sent ? p.reminders![sent - 1] : p.sentAt;
  return addOpenMinutes(new Date(last), REMINDER_AFTER_OPEN_MINUTES, hours, timezone);
}
