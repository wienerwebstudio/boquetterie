import { NextResponse } from "next/server";
import { getOrders, getPartners, getSettings, updateOrder } from "@/lib/cms";
import { sendPartnerOrder, sendPartnerReminderNotice } from "@/lib/mail";
import { authorizeCron } from "@/lib/mail/cron";
import { getLocalNow } from "@/lib/delivery";
import { MAX_PARTNER_REMINDERS, nextPartnerReminderAt, remindersSent } from "@/lib/partner-reminders";

export const dynamic = "force-dynamic";

/**
 * GET|POST /api/cron/partner-reminders  (Authorization: Bearer $CRON_SECRET)
 * For every order slip a partner has not confirmed: after 30 OPEN minutes (partner's
 * opening hours) the partner gets the slip again ("Erinnerung n") and the team a notice
 * with the phone number – at most MAX_PARTNER_REMINDERS times, then the team calls.
 * Runs every 10 minutes (netlify/functions/cron-partner-reminders.mts).
 */
async function run(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const [orders, partners, settings] = await Promise.all([getOrders(), getPartners(), getSettings()]);
  const tz = settings.timezone || "Europe/Vienna";
  const today = getLocalNow(tz).date;
  const now = Date.now();
  let checked = 0, sent = 0, failed = 0;

  for (const order of orders) {
    const partner = order.partner && partners.find((p) => p.id === order.partner?.id);
    if (!partner) continue;
    const due = nextPartnerReminderAt(order, partner, today, tz);
    if (!due) continue;
    checked++;
    if (due.getTime() > now) continue;

    const n = remindersSent(order) + 1;
    try {
      const { result } = await sendPartnerOrder(order, partner, order.partner!.confirmToken, n);
      const ok = Boolean(result?.sent || result?.provider === "console");
      const at = new Date().toISOString();
      // Recorded even when the partner mail failed, so the team is not mailed every 10 minutes.
      await updateOrder(order.id, (o) =>
        o.partner && o.partner.confirmToken === order.partner!.confirmToken && !o.partner.confirmedAt
          ? {
              ...o,
              partner: { ...o.partner, reminders: [...(o.partner.reminders ?? []), at] },
              history: [...o.history, { status: o.status, at, note: `Erinnerung ${n} an ${partner.name}${ok ? " gesendet" : " NICHT gesendet"} (noch nicht bestätigt)` }],
            }
          : o,
      );
      await sendPartnerReminderNotice(order, partner, n, n >= MAX_PARTNER_REMINDERS, ok);
      if (ok) sent++;
      else failed++;
    } catch (err) {
      failed++;
      console.error("[cron/partner-reminders] failed", order.id, err);
    }
  }
  return NextResponse.json({ ok: true, checked, sent, failed });
}

export const GET = run;
export const POST = run;
