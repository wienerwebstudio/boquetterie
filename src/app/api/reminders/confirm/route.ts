import { NextResponse } from "next/server";
import { getReminders, saveReminders, tokenMatches } from "@/lib/mail/reminders";

export const dynamic = "force-dynamic";

/**
 * GET /api/reminders/confirm?id=…&token=…
 * Double-opt-in: activates the reminder and redirects to /erinnerung with a status.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const token = url.searchParams.get("token") ?? "";
  const back = (status: string) => NextResponse.redirect(new URL(`/erinnerung?status=${status}`, url.origin), 303);

  try {
    const list = await getReminders();
    const reminder = list.find((r) => r.id === id);
    if (!reminder || !tokenMatches(reminder.unsubscribeToken, token)) return back("ungueltig");
    if (!reminder.confirmed) {
      reminder.confirmed = true;
      reminder.confirmedAt = new Date().toISOString();
      await saveReminders(list);
    }
    return back("bestaetigt");
  } catch (err) {
    console.error("[reminders] confirm failed", err);
    return back("fehler");
  }
}
