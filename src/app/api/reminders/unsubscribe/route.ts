import { NextResponse } from "next/server";
import { getReminders, saveReminders, tokenMatches } from "@/lib/mail/reminders";

export const dynamic = "force-dynamic";

/**
 * GET /api/reminders/unsubscribe?id=…&token=…
 * Removes the reminder and redirects to /erinnerung with a status.
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
    await saveReminders(list.filter((r) => r.id !== id));
    return back("geloescht");
  } catch (err) {
    console.error("[reminders] unsubscribe failed", err);
    return back("fehler");
  }
}
