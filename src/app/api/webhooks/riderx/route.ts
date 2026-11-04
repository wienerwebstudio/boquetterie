import { NextResponse } from "next/server";
import { applyRiderxEvent, courierEnabled, type RiderxWebhookEvent } from "@/lib/courier";
import { verifyRiderxSignature } from "@/lib/courier/riderx-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/riderx
 * RiderX delivery events. `X-Service-Signature` is verified (HMAC-SHA256 of the
 * raw body with RIDERX_WEBHOOK_SECRET) before anything is read. Verified events
 * are always answered with 200 – also unknown ones like `chat.message_created` –
 * so RiderX does not retry them.
 */
export async function POST(req: Request) {
  const secret = process.env.RIDERX_WEBHOOK_SECRET?.trim();
  if (!courierEnabled() || !secret) {
    return NextResponse.json({ ok: false, message: "RiderX webhooks are not configured." }, { status: 404 });
  }
  const raw = await req.text();
  if (!verifyRiderxSignature(raw, req.headers.get("x-service-signature"), secret)) {
    return NextResponse.json({ ok: false, message: "Invalid signature." }, { status: 401 });
  }
  let evt: RiderxWebhookEvent;
  try {
    evt = JSON.parse(raw) as RiderxWebhookEvent;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }
  try {
    const result = await applyRiderxEvent(evt);
    if (!result.orderId && (evt.event === "delivery.updated" || evt.event === "delivery.created")) {
      console.warn(`[webhooks/riderx] ${evt.event}: no order for delivery ${evt.delivery?.id}`);
    }
    return NextResponse.json({ ok: true, received: true, event: evt.event ?? null, ...result });
  } catch (err) {
    console.error("[webhooks/riderx] failed", err);
    return NextResponse.json({ ok: false, message: "Webhook processing failed." }, { status: 500 });
  }
}
