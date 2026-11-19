import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/mail/cron";
import { processOutreachQueue } from "@/lib/outreach/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET|POST /api/cron/outreach  (Authorization: Bearer $CRON_SECRET)
 * Sends due outreach mails: scheduled sends, the remainder held back by the daily
 * limit (OUTREACH_DAILY_LIMIT) and follow-ups. Runs every 10 minutes
 * (netlify/functions/cron-outreach.mts); see docs/OUTREACH.md.
 */
async function run(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;
  try {
    const result = await processOutreachQueue();
    return NextResponse.json({ ok: !result.error, ...result });
  } catch (err) {
    console.error("[cron/outreach] failed", err);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
