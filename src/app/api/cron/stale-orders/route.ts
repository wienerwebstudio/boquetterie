import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/mail/cron";
import { expireStaleOrders } from "@/lib/stale-orders";
import { pruneCheckoutDrafts } from "@/lib/checkout-drafts";

export const dynamic = "force-dynamic";

/**
 * GET|POST /api/cron/stale-orders  (Authorization: Bearer $CRON_SECRET)
 * Marks orders whose payment is still pending 2 hours after their last activity as
 * failed ("Zahlung abgebrochen (nach 2 Std. automatisch)", stock released once; Stripe
 * orders are checked with Stripe first) and deletes "Abgebrochene Kasse" entries older
 * than 30 days. Paid orders are never touched. Run hourly (docs/DEPLOYMENT.md).
 */
async function run(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;
  const result = await expireStaleOrders();
  const draftsDeleted = await pruneCheckoutDrafts().catch((err: unknown) => {
    console.error("[cron/stale-orders] pruning drafts failed", err);
    return 0;
  });
  return NextResponse.json({ ok: true, ...result, draftsDeleted });
}

export const GET = run;
export const POST = run;
