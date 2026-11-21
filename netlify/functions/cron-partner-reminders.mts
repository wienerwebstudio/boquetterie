import { triggerCron, type CronContext } from "../lib/cron-trigger.js";

/**
 * Netlify scheduled function: every 10 minutes, reminds partner florists that have not
 * confirmed an order slip (only counting their opening hours) and tells the team, by
 * calling /api/cron/partner-reminders. Needs CRON_SECRET (Functions scope).
 */
export default async function handler(_req: Request, context: CronContext) {
  await triggerCron("/api/cron/partner-reminders", context);
}

export const config = {
  schedule: "*/10 * * * *",
};
