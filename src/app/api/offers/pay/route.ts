import { NextResponse } from "next/server";
import { getSettings } from "@/lib/cms";
import { findOfferByToken } from "@/lib/offers";
import { createOrderFromOffer } from "@/lib/orders";
import { orderAnalyticsFromRequest } from "@/lib/analytics-server";
import { resolveSiteUrl } from "@/lib/payments";
import { enforceRateLimit } from "@/lib/rate-limit";
import { ORDERS_PAUSED_MESSAGE, ordersPaused } from "@/lib/orders-paused";
import type { PaymentMethodId } from "@/types/payments";
import type { OfferPayResponse } from "@/types/offers";

export const dynamic = "force-dynamic";

const METHODS = new Set<PaymentMethodId>(["apple_pay", "google_pay", "card", "paypal", "klarna", "eps"]);

/**
 * POST /api/offers/pay { token, method, acceptedTerms }
 * Starts (or resumes) the payment of an individual offer. The body only names the
 * offer link token and the payment method – every amount comes from the stored offer
 * (`createOrderFromOffer`). Answers like POST /api/orders: `payment.provider` tells the
 * browser how to continue (mock → status page, stripe → Payment Element, paypal → redirect).
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "offer-pay", limit: 10, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  if (ordersPaused()) return NextResponse.json({ ok: false, code: "payment", message: ORDERS_PAUSED_MESSAGE } satisfies OfferPayResponse, { status: 503 });

  let body: Record<string, unknown>;
  try {
    const raw: unknown = await req.json();
    body = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ ok: false, code: "invalid", message: "Ungültige Anfrage." } satisfies OfferPayResponse, { status: 400 });
  }
  const method = typeof body.method === "string" && METHODS.has(body.method as PaymentMethodId) ? (body.method as PaymentMethodId) : null;
  if (!method) return NextResponse.json({ ok: false, code: "method", message: "Bitte wähle eine Zahlungsart." } satisfies OfferPayResponse, { status: 400 });
  if (body.acceptedTerms !== true) return NextResponse.json({ ok: false, code: "terms", message: "Bitte bestätige die AGB." } satisfies OfferPayResponse, { status: 400 });

  const offer = await findOfferByToken(body.token);
  if (!offer) return NextResponse.json({ ok: false, code: "not_found", message: "Angebot nicht gefunden." } satisfies OfferPayResponse, { status: 404 });

  try {
    const settings = await getSettings();
    const result = await createOrderFromOffer(offer.id, method, {
      siteUrl: resolveSiteUrl(req, settings),
      analytics: orderAnalyticsFromRequest(body.analytics, req.headers.get("user-agent")),
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, code: result.code, message: result.message } satisfies OfferPayResponse, { status: result.status });
    }
    const res: OfferPayResponse = {
      ok: true,
      id: result.order.id,
      token: result.order.token,
      status: result.order.status,
      total: result.order.totals.total,
      payment: { provider: result.payment.provider, status: result.payment.status, clientSecret: result.payment.clientSecret, approveUrl: result.payment.approveUrl },
    };
    return NextResponse.json(res, { status: result.reused ? 200 : 201 });
  } catch (err) {
    console.error("[offers] payment start failed", err);
    return NextResponse.json({ ok: false, code: "payment", message: "Die Zahlung konnte nicht gestartet werden." } satisfies OfferPayResponse, { status: 500 });
  }
}
