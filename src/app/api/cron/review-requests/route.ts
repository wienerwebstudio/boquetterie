import { NextResponse } from "next/server";
import { sendReviewRequest } from "@/lib/mail";
import { authorizeCron } from "@/lib/mail/cron";
import { findOrdersDueForReviewRequest, getReviewRequests, saveReviewRequests } from "@/lib/mail/review-requests";

export const dynamic = "force-dynamic";

/**
 * GET|POST /api/cron/review-requests  (Authorization: Bearer $CRON_SECRET)
 * Sends "Wie war der Strauß?" once per delivered order, 2–30 days after delivery.
 * Sent orders are logged in data/review-requests.json. Run once a day.
 */
async function run(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const due = await findOrdersDueForReviewRequest();
  const records = await getReviewRequests();
  let sent = 0;
  let failed = 0;

  for (const order of due) {
    try {
      const result = await sendReviewRequest(order);
      if (!result.sent && result.provider !== "console") {
        failed++;
        continue;
      }
      records.push({ orderId: order.id, sentAt: new Date().toISOString() });
      sent++;
    } catch (err) {
      failed++;
      console.error("[cron/review-requests] send failed", order.id, err);
    }
  }

  if (sent > 0) await saveReviewRequests(records);
  return NextResponse.json({ ok: true, due: due.length, sent, failed });
}

export const GET = run;
export const POST = run;
