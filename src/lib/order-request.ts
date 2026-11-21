import "server-only";
import { after, NextResponse } from "next/server";
import { getSettings } from "@/lib/cms";
import { createOrderFromPayload, parseOrderPayload } from "@/lib/orders";
import { resolveSiteUrl } from "@/lib/payments";
import { subscribeFromCheckout } from "@/lib/newsletter";
import { deleteCheckoutDraft, isDraftId } from "@/lib/checkout-drafts";
import { ORDERS_PAUSED_MESSAGE, ordersPaused } from "@/lib/orders-paused";
import type { OrderCreateResponse } from "@/types/payments";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { loadMessages } from "@/i18n/messages";

/**
 * Creates an order from an untrusted JSON body – shared by `POST /api/orders` (checkout)
 * and `POST /api/express/order` (Apple Pay / Google Pay express purchase), so both run
 * exactly the same validation, catalog pricing, stock reservation and payment start.
 * The caller rate-limits first.
 *
 * `draftId` (body field or `opts.draftId`): the "Abgebrochene Kasse" snapshot of the same
 * browser session – deleted once the order exists (the order itself now shows the data).
 */
export async function createOrderResponse(req: Request, body: unknown, opts: { draftId?: unknown } = {}): Promise<NextResponse> {
  if (ordersPaused()) return NextResponse.json({ ok: false, message: ORDERS_PAUSED_MESSAGE }, { status: 503 });
  const draftId = opts.draftId ?? (body && typeof body === "object" ? (body as { draftId?: unknown }).draftId : undefined);

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
    const result = await createOrderFromPayload(payload, { siteUrl: resolveSiteUrl(req, settings), locale: isLocale(requested) ? requested : undefined });
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message, errors: result.errors ?? {} }, { status: result.status });
    }
    // Newsletter tick box in the checkout: subscribed right away (no confirmation mail), with the order as consent record.
    if (payload.customer.newsletter && settings.newsletterEnabled) {
      const orderId = result.order.id;
      const signup = () => subscribeFromCheckout(payload.customer.email, orderId).then(() => undefined, (err: unknown) => console.error("[newsletter] checkout sign-up failed", err));
      try { after(signup); } catch { void signup(); }
    }
    if (isDraftId(draftId)) {
      const drop = () => deleteCheckoutDraft(draftId).then(() => undefined, (err: unknown) => console.error("[drafts] deleting the checkout draft failed", err));
      try { after(drop); } catch { void drop(); }
    }
    const res: OrderCreateResponse = {
      ok: true,
      id: result.order.id,
      token: result.order.token,
      status: result.order.status,
      total: result.order.totals.total,
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

/** Reads a JSON body without throwing. */
export async function readJson(req: Request): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: await req.json() };
  } catch {
    return { ok: false };
  }
}

/** 400 "invalid request" in German (the body could not be read, so no language is known). */
export async function invalidRequest() {
  return NextResponse.json({ ok: false, message: (await loadMessages(DEFAULT_LOCALE)).checkout.api.invalidRequest }, { status: 400 });
}
