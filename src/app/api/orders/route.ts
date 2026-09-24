import { NextResponse } from "next/server";
import { getSettings } from "@/lib/cms";
import { createOrderFromPayload, parseOrderPayload } from "@/lib/orders";
import { resolveSiteUrl } from "@/lib/payments";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { OrderCreateResponse } from "@/types/payments";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders
 * Body: OrderPayload (see `src/lib/order-payload.ts`).
 * Validates structurally, re-resolves every price from the catalog, checks zone,
 * delivery day, window and coupon, reserves stock, stores the order (payment
 * pending) and starts the provider payment.
 *
 * Response `{ id, token, status, payment }` – the token is the only credential
 * for the status page. `payment.provider` tells the browser how to continue:
 *   mock   → already paid, go to the status page
 *   stripe → confirm `payment.clientSecret` with the Payment Element
 *   paypal → redirect to `payment.approveUrl`
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "orders", limit: 10, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

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
    const result = await createOrderFromPayload(parsed.payload, { siteUrl: resolveSiteUrl(req, settings) });
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message, errors: result.errors ?? {} }, { status: result.status });
    }
    const res: OrderCreateResponse = {
      ok: true,
      id: result.order.id,
      token: result.order.token,
      status: result.order.status,
      payment: {
        provider: result.payment.provider,
        status: result.payment.status,
        clientSecret: result.payment.clientSecret,
        approveUrl: result.payment.approveUrl,
      },
    };
    return NextResponse.json(res, { status: 201 });
  } catch (err) {
    console.error("[orders] create failed", err);
    return NextResponse.json({ ok: false, message: "Die Bestellung konnte gerade nicht gespeichert werden. Bitte versuch es in einem Moment noch einmal." }, { status: 500 });
  }
}
