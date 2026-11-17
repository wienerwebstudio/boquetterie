import { triggerCron, type CronContext } from "../lib/cron-trigger.js";

/**
 * Netlify scheduled function: once a day, sends the confirmed occasion reminders that
 * are due today (Europe/Vienna) by calling /api/cron/reminders on the published site.
 * Needs CRON_SECRET (Functions scope). Scheduled functions run only on the published
 * production deploy.
 */
export default async function handler(_req: Request, context: CronContext) {
  await triggerCron("/api/cron/reminders", context);
}

export const config = {
  // UTC: 07:00 = 09:00 in summer (CEST), 08:00 in winter (CET).
  schedule: "0 7 * * *",
};
