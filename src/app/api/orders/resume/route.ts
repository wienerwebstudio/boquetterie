import { NextResponse } from "next/server";
import { getSettings } from "@/lib/cms";
import { resumeCheckoutOrder } from "@/lib/orders";
import { resolveSiteUrl } from "@/lib/payments";
import { enforceRateLimit } from "@/lib/rate-limit";
import { invalidRequest, readJson } from "@/lib/order-request";
import type { OrderCreateResponse, PaymentMethodId } from "@/types/payments";

export const dynamic = "force-dynamic";

const METHODS = new Set<PaymentMethodId>(["apple_pay", "google_pay", "card", "klarna", "eps"]);

/**
 * POST /api/orders/resume { orderId, token, method }
 * The checkout tries again after a cancelled/failed Stripe payment in the same browser
 * session (same cart and details): continues the stored order and its PaymentIntent
 * instead of creating a duplicate. Answers like POST /api/orders (amount = the stored
 * order's), or `{ ok: false, code }` – then the browser creates a new order.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "orders-resume", limit: 20, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  const read = await readJson(req);
  if (!read.ok || !read.body || typeof read.body !== "object") return invalidRequest();
  const body = read.body as { orderId?: unknown; token?: unknown; method?: unknown };
  const orderId = typeof body.orderId === "string" ? body.orderId.trim().toUpperCase().slice(0, 20) : "";
  const token = typeof body.token === "string" ? body.token.slice(0, 64) : "";
  const method = typeof body.method === "string" && METHODS.has(body.method as PaymentMethodId) ? (body.method as PaymentMethodId) : null;
  if (!orderId || !token || !method) return invalidRequest();

  try {
    const settings = await getSettings();
    const result = await resumeCheckoutOrder(orderId, token, method, { siteUrl: resolveSiteUrl(req, settings) });
    if (!result.ok) return NextResponse.json({ ok: false, code: result.code }, { status: result.status });
    const res: OrderCreateResponse = {
      ok: true,
      id: result.order.id,
      token: result.order.token,
      status: result.order.status,
      total: result.order.totals.total,
      payment: { provider: result.payment.provider, status: result.payment.status, clientSecret: result.payment.clientSecret },
    };
    return NextResponse.json(res);
  } catch (err) {
    console.error("[orders] resume failed", err);
    return NextResponse.json({ ok: false, code: "payment" }, { status: 500 });
  }
}
