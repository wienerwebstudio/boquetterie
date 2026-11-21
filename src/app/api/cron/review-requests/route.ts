import { NextResponse } from "next/server";
import { sendReviewRequest } from "@/lib/mail";
import { authorizeCron } from "@/lib/mail/cron";
import {
  findOrdersDueForReviewRequest,
  getReviewRequests,
  mailWentOut,
  MAX_DAYS_AFTER_DELIVERY,
  MIN_DAYS_AFTER_DELIVERY,
  saveReviewRequests,
  withRequestSent,
} from "@/lib/mail/review-requests";

export const dynamic = "force-dynamic";

/**
 * GET|POST /api/cron/review-requests  (Authorization: Bearer $CRON_SECRET)
 * Sends "Wie war der Strauß?" once per delivered order, 1–30 days after delivery
 * (MIN/MAX_DAYS_AFTER_DELIVERY). Orders that already got a request – from this cron
 * or by hand in the admin – are logged in data/review-requests.json and skipped.
 * Run once a day (on Netlify: netlify/functions/cron-review-requests.mts).
 */
async function run(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const due = await findOrdersDueForReviewRequest();
  const sentIds: string[] = [];
  let failed = 0;

  for (const order of due) {
    try {
      const result = await sendReviewRequest(order);
      if (!mailWentOut(result)) {
        failed++;
        continue; // try again on the next run
      }
      sentIds.push(order.id);
    } catch (err) {
      failed++;
      console.error("[cron/review-requests] send failed", order.id, err);
    }
  }

  if (sentIds.length > 0) {
    // Re-read right before writing so a submission or manual send that happened meanwhile is kept.
    const at = new Date().toISOString();
    let records = await getReviewRequests();
    for (const id of sentIds) records = withRequestSent(records, id, "cron", at);
    await saveReviewRequests(records);
  }
  return NextResponse.json({ ok: true, window: `${MIN_DAYS_AFTER_DELIVERY}-${MAX_DAYS_AFTER_DELIVERY}d`, due: due.length, sent: sentIds.length, failed });
}

export const GET = run;
export const POST = run;
