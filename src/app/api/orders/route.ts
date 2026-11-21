import { enforceRateLimit } from "@/lib/rate-limit";
import { createOrderResponse, invalidRequest, readJson } from "@/lib/order-request";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders
 * Body: OrderPayload (see `src/lib/order-payload.ts`), plus an optional `locale`
 * that picks the language of the validation messages and of the customer mails
 * (stored as `order.locale`; German by default).
 * Validates structurally, re-resolves every price from the catalog, checks zone,
 * delivery day, window and coupon, reserves stock, stores the order (payment
 * pending) and starts the provider payment (`src/lib/order-request.ts`).
 *
 * Response `{ id, token, status, total, payment }` – the token is the only credential
 * for the status page; `total` is the server-side amount of the payment.
 * `payment.provider` tells the browser how to continue:
 *   mock   → already paid, go to the status page
 *   stripe → confirm `payment.clientSecret` with the (already submitted) Payment Element
 *   paypal → redirect to `payment.approveUrl`
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "orders", limit: 10, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  const read = await readJson(req);
  if (!read.ok) return invalidRequest();
  return createOrderResponse(req, read.body);
}
