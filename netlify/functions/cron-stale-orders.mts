import { triggerCron, type CronContext } from "../lib/cron-trigger.js";

/**
 * Netlify scheduled function: every hour, marks orders whose payment is still pending
 * 2 hours after their last activity as failed (stock released, Stripe checked first)
 * and deletes "Abgebrochene Kasse" entries older than 30 days, by calling
 * /api/cron/stale-orders on the published site. Needs CRON_SECRET (Functions scope).
 * Scheduled functions run only on the published production deploy.
 */
export default async function handler(_req: Request, context: CronContext) {
  await triggerCron("/api/cron/stale-orders", context);
}

export const config = {
  // Every hour at minute 17.
  schedule: "17 * * * *",
};
