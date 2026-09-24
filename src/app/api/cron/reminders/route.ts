import { NextResponse } from "next/server";
import { getSettings } from "@/lib/cms";
import { sendOccasionReminder } from "@/lib/mail";
import { authorizeCron } from "@/lib/mail/cron";
import { dueForYear, getReminders, pruneUnconfirmed, saveReminders, todayIso } from "@/lib/mail/reminders";

export const dynamic = "force-dynamic";

/**
 * GET|POST /api/cron/reminders  (Authorization: Bearer $CRON_SECRET)
 * Sends every confirmed reminder whose send window includes today (Europe/Vienna).
 * Yearly reminders get `lastSentYear` set and fire again next year; one-time
 * reminders are removed after sending. Run once a day (see docs/MAIL.md).
 */
async function run(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const settings = await getSettings();
  const today = todayIso(settings.timezone);
  const list = pruneUnconfirmed(await getReminders());
  const keep = [...list];
  let sent = 0;
  let failed = 0;
  let due = 0;

  for (const reminder of list) {
    const hit = dueForYear(reminder, today);
    if (!hit) continue;
    due++;
    try {
      const result = await sendOccasionReminder(reminder, hit.daysUntil);
      if (!result.sent && result.provider !== "console") {
        failed++;
        continue; // try again on the next run
      }
      sent++;
      if (reminder.yearly) reminder.lastSentYear = hit.year;
      else keep.splice(keep.indexOf(reminder), 1);
    } catch (err) {
      failed++;
      console.error("[cron/reminders] send failed", reminder.id, err);
    }
  }

  await saveReminders(keep);
  return NextResponse.json({ ok: true, today, checked: list.length, due, sent, failed });
}

export const GET = run;
export const POST = run;
