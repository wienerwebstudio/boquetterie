import { after, NextResponse } from "next/server";
import { getSettings } from "@/lib/cms";
import { createOrderFromPayload, parseOrderPayload } from "@/lib/orders";
import { resolveSiteUrl } from "@/lib/payments";
import { subscribeFromCheckout } from "@/lib/newsletter";
import { enforceRateLimit } from "@/lib/rate-limit";
import { ORDERS_PAUSED_MESSAGE, ordersPaused } from "@/lib/orders-paused";
import type { OrderCreateResponse } from "@/types/payments";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { loadMessages } from "@/i18n/messages";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders
 * Body: OrderPayload (see `src/lib/order-payload.ts`), plus an optional `locale`
 * that picks the language of the validation messages (German by default).
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
  if (ordersPaused()) return NextResponse.json({ ok: false, message: ORDERS_PAUSED_MESSAGE }, { status: 503 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: (await loadMessages(DEFAULT_LOCALE)).checkout.api.invalidRequest }, { status: 400 });
  }

  const requested = body && typeof body === "object" ? (body as { locale?: unknown }).locale : undefined;
  const t = (await loadMessages(isLocale(requested) ? requested : DEFAULT_LOCALE)).checkout;
  const settings = await getSettings();
  const parsed = parseOrderPayload(body, { greetingMaxChars: settings.greetingCard.maxChars, messages: t });
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: parsed.message, errors: parsed.errors ?? {} }, { status: parsed.status });
  }

  // Greeting cards not on offer: drop any card text (e.g. from a cart saved before they were switched off).
  const payload = settings.greetingCard.enabled === true
    ? parsed.payload
    : { ...parsed.payload, items: parsed.payload.items.map((i) => ({ ...i, message: undefined, anonymous: undefined, senderName: undefined })) };

  try {
    const result = await createOrderFromPayload(payload, { siteUrl: resolveSiteUrl(req, settings) });
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message, errors: result.errors ?? {} }, { status: result.status });
    }
    // Newsletter tick box in the checkout: subscribed right away (no confirmation mail), with the order as consent record.
    if (payload.customer.newsletter && settings.newsletterEnabled) {
      const orderId = result.order.id;
      const signup = () => subscribeFromCheckout(payload.customer.email, orderId).then(() => undefined, (err: unknown) => console.error("[newsletter] checkout sign-up failed", err));
      try { after(signup); } catch { void signup(); }
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
    return NextResponse.json({ ok: false, message: t.api.saveFailed }, { status: 500 });
  }
}
