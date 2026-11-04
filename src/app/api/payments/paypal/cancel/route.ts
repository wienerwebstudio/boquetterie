import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getOrderById, getSettings } from "@/lib/cms";
import { markOrderPaymentFailed } from "@/lib/orders";
import { resolveSiteUrl } from "@/lib/payments";

export const dynamic = "force-dynamic";

function tokenMatches(expected: string, given: string) {
  if (!given || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

/**
 * GET /api/payments/paypal/cancel?orderId&token
 * The customer left PayPal without paying: release the reserved stock, mark the
 * payment as failed and return to the checkout (form state is still in sessionStorage).
 */
export async function GET(req: Request) {
  const settings = await getSettings();
  const site = resolveSiteUrl(req, settings);
  const url = new URL(req.url);
  const orderId = (url.searchParams.get("orderId") ?? "").trim().toUpperCase();
  const order = orderId ? await getOrderById(orderId) : null;
  const ourToken = order ? url.searchParams.getAll("token").find((t) => tokenMatches(order.token, t)) : undefined;
  if (order && ourToken && order.payment.status === "pending") {
    await markOrderPaymentFailed(order.id, { note: "PayPal-Zahlung vom Kunden abgebrochen" });
  }
  return NextResponse.redirect(`${site}/checkout?cancelled=1`, 303);
}
