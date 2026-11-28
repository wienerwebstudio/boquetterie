import { getReminders, saveReminders, tokenMatches } from "@/lib/mail/reminders";
import { redirectLocal } from "@/lib/http";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/paths";

export const dynamic = "force-dynamic";

/**
 * GET /api/reminders/confirm?id=…&token=…
 * Double-opt-in: activates the reminder and redirects to /erinnerung with a status.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const token = url.searchParams.get("token") ?? "";
  // Back to the reminder page in the reminder's language (German without prefix).
  let locale: Locale = DEFAULT_LOCALE;
  const back = (status: string) => redirectLocal(localizePath(locale, `/erinnerung?status=${status}`));

  try {
    const list = await getReminders();
    const reminder = list.find((r) => r.id === id);
    if (!reminder || !tokenMatches(reminder.unsubscribeToken, token)) return back("ungueltig");
    if (isLocale(reminder.locale)) locale = reminder.locale;
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
