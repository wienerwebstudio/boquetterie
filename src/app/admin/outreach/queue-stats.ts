import "server-only";
import { mailProvider } from "@/lib/mail";
import { dailyLimit, sentToday } from "@/lib/outreach/queue";
import { outreachSecret } from "@/lib/outreach/tokens";
import type { OutreachSend } from "@/types/outreach";

/** Numbers for the queue card (overview and Versand page). */
export function queueStats(sends: OutreachSend[], now = new Date()) {
  const queued = sends.filter((s) => s.status === "queued");
  return {
    queued: queued.length,
    due: queued.filter((s) => new Date(s.scheduledFor).getTime() <= now.getTime()).length,
    followUps: queued.filter((s) => s.kind === "followup").length,
    sentToday: sentToday(sends, now),
    limit: dailyLimit(),
    provider: mailProvider(),
    secretOk: outreachSecret() !== null,
  };
}
