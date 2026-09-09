import { NextResponse } from "next/server";
import { getSettings } from "@/lib/cms";
import { createOrderFromPayload, parseOrderPayload } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders
 * Body: OrderPayload (see `src/lib/order-payload.ts`).
 * Validates structurally, re-resolves every price from the catalog, checks zone,
 * delivery day, window and coupon, runs the payment provider and stores the order.
 * Returns `{ id, token }` – the token is the only credential for the status page.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  }

  const settings = await getSettings();
  const parsed = parseOrderPayload(body, { greetingMaxChars: settings.greetingCard.maxChars });
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: parsed.message, errors: parsed.errors ?? {} }, { status: parsed.status });
  }

  try {
    const result = await createOrderFromPayload(parsed.payload);
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message, errors: result.errors ?? {} }, { status: result.status });
    }
    return NextResponse.json({ ok: true, id: result.order.id, token: result.order.token, status: result.order.status }, { status: 201 });
  } catch (err) {
    console.error("[orders] create failed", err);
    return NextResponse.json({ ok: false, message: "Die Bestellung konnte gerade nicht gespeichert werden. Bitte versuch es in einem Moment noch einmal." }, { status: 500 });
  }
}
