import { triggerCron, type CronContext } from "../lib/cron-trigger.js";

/**
 * Netlify scheduled function: every 10 minutes, sends due outreach mails (scheduled
 * sends, the rest held back by the daily limit, follow-ups) by calling
 * /api/cron/outreach on the published site. Needs CRON_SECRET (Functions scope).
 * See docs/OUTREACH.md.
 */
export default async function handler(_req: Request, context: CronContext) {
  await triggerCron("/api/cron/outreach", context);
}

export const config = {
  schedule: "*/10 * * * *",
};
