import { triggerCron, type CronContext } from "../lib/cron-trigger.js";

/**
 * Netlify scheduled function: once a day, sends the "Wie war der Strauß?" mails that
 * are due (1–30 days after delivery, once per order) by calling
 * /api/cron/review-requests on the published site. Needs CRON_SECRET (Functions scope).
 * Scheduled functions run only on the published production deploy.
 */
export default async function handler(_req: Request, context: CronContext) {
  await triggerCron("/api/cron/review-requests", context);
}

export const config = {
  // UTC: 07:30 = 09:30 in summer (CEST), 08:30 in winter (CET).
  schedule: "30 7 * * *",
};
