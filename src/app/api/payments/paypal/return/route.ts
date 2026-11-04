import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getOrderById, getSettings } from "@/lib/cms";
import { markOrderPaid, markOrderPaymentFailed } from "@/lib/orders";
import { paypalConfigured, resolveSiteUrl, verifyPayment } from "@/lib/payments";
import { capturePayPalOrder } from "@/lib/payments/paypal";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function tokenMatches(expected: string, given: string) {
  if (!given || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

/**
 * GET /api/payments/paypal/return?orderId&token[&paypalOrderId]
 * PayPal sends the customer here after approval (and appends its own `token`
 * = PayPal order id and `PayerID`). We capture server-side, mark the order paid
 * and land on the status page. Failures go back to the checkout.
 */
export async function GET(req: Request) {
  const limited = enforceRateLimit(req, { scope: "payments-confirm", limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const settings = await getSettings();
  const site = resolveSiteUrl(req, settings);
  const url = new URL(req.url);
  const orderId = (url.searchParams.get("orderId") ?? "").trim().toUpperCase();
  const order = orderId && paypalConfigured() ? await getOrderById(orderId) : null;
  // Our tracking token comes first; PayPal appends its own `token` (the PayPal order id).
  const ourToken = order ? url.searchParams.getAll("token").find((t) => tokenMatches(order.token, t)) : undefined;
  if (!order || !ourToken || order.payment.provider !== "paypal") {
    return NextResponse.redirect(`${site}/checkout?cancelled=1`, 303);
  }
  const success = `${site}/bestellung/${encodeURIComponent(order.id)}?token=${encodeURIComponent(order.token)}&neu=1`;
  if (order.payment.status === "paid") return NextResponse.redirect(success, 303);

  const paypalOrderId = url.searchParams.get("paypalOrderId") ?? order.payment.intentId ?? url.searchParams.getAll("token").find((t) => t !== ourToken);
  if (!paypalOrderId || (order.payment.intentId && paypalOrderId !== order.payment.intentId)) {
    return NextResponse.redirect(`${site}/checkout?cancelled=1`, 303);
  }

  try {
    let result = await capturePayPalOrder(paypalOrderId, order.id);
    if (result.status === "unknown") result = await verifyPayment(order);
    if (result.status === "paid") {
      await markOrderPaid(order.id, { provider: "paypal", reference: result.reference, intentId: paypalOrderId, note: "Zahlung per PayPal bestätigt" });
      return NextResponse.redirect(success, 303);
    }
    if (result.status === "pending") {
      // e.g. capture PENDING (review) – the webhook will settle it; show the order as pending.
      return NextResponse.redirect(success, 303);
    }
    await markOrderPaymentFailed(order.id, { note: result.message ?? "PayPal-Zahlung fehlgeschlagen", intentId: paypalOrderId });
    return NextResponse.redirect(`${site}/checkout?cancelled=1`, 303);
  } catch (err) {
    console.error("[payments] paypal capture failed", err);
    return NextResponse.redirect(`${site}/checkout?cancelled=1`, 303);
  }
}
