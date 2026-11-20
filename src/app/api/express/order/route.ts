import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createOrderResponse, invalidRequest, readJson } from "@/lib/order-request";
import { stripeConfigured } from "@/lib/payments";
import { buildExpressOrderBody, type ExpressWalletData } from "@/lib/express";

export const dynamic = "force-dynamic";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);

/**
 * POST /api/express/order
 * Body: { items, couponCode?, delivery: { date, windowId? }, wallet: { expressPaymentType,
 * billingDetails, shippingAddress }, acceptedTerms: true, locale?, draftId? }
 *
 * Express purchase from the product page or the cart (Stripe Express Checkout Element).
 * The wallet data is mapped to the checkout payload (buyer = billing contact, recipient =
 * shipping contact) and then created by the very same code as `POST /api/orders`:
 * structural validation, catalog prices, zone/day/window/coupon, stock, PaymentIntent.
 * Response like `/api/orders` – the browser confirms `payment.clientSecret` with Stripe.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "express-order", limit: 10, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  if (!stripeConfigured()) return NextResponse.json({ ok: false, message: "Express-Kauf ist derzeit nicht verfügbar." }, { status: 404 });
  const read = await readJson(req);
  if (!read.ok || !read.body || typeof read.body !== "object" || Array.isArray(read.body)) return invalidRequest();
  const body = read.body as Record<string, unknown>;
  if (body.acceptedTerms !== true) return invalidRequest();

  const w = (body.wallet && typeof body.wallet === "object" ? body.wallet : {}) as Record<string, unknown>;
  const billing = (w.billingDetails && typeof w.billingDetails === "object" ? w.billingDetails : {}) as Record<string, unknown>;
  const shipping = (w.shippingAddress && typeof w.shippingAddress === "object" ? w.shippingAddress : {}) as Record<string, unknown>;
  const address = (shipping.address && typeof shipping.address === "object" ? shipping.address : {}) as Record<string, unknown>;
  const country = str(address.country, 4);
  if (country && country.toUpperCase() !== "AT") {
    return NextResponse.json({ ok: false, code: "zone", message: "In dieses Gebiet liefern wir derzeit leider noch nicht." }, { status: 400 });
  }
  const wallet: ExpressWalletData = {
    expressPaymentType: str(w.expressPaymentType, 20) ?? "",
    billingDetails: { name: str(billing.name, 200), email: str(billing.email, 200), phone: str(billing.phone, 60) },
    shippingAddress: {
      name: str(shipping.name, 200),
      address: { line1: str(address.line1, 200), line2: str(address.line2, 200) ?? null, city: str(address.city, 100), postal_code: str(address.postal_code, 10), country },
    },
  };
  const delivery = (body.delivery && typeof body.delivery === "object" ? body.delivery : {}) as Record<string, unknown>;
  const orderBody = buildExpressOrderBody({
    items: body.items,
    couponCode: str(body.couponCode, 40),
    delivery: { date: str(delivery.date, 10), windowId: str(delivery.windowId, 40) },
    wallet,
    locale: str(body.locale, 5),
  });
  // `draftId`: the "Abgebrochene Kasse" entry of an earlier closed wallet sheet – removed once the order exists.
  return createOrderResponse(req, orderBody, { draftId: body.draftId });
}
