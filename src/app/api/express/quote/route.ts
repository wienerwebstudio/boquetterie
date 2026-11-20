import { NextResponse } from "next/server";
import { getSettings } from "@/lib/cms";
import { normalizePostalCode, isValidAustrianPostalCode } from "@/lib/delivery";
import { parseOrderItems, priceOrder } from "@/lib/orders";
import { stripeConfigured } from "@/lib/payments";
import { enforceRateLimit } from "@/lib/rate-limit";
import { cleanString } from "@/lib/order-payload";
import { invalidRequest, readJson } from "@/lib/order-request";
import type { ExpressQuoteResponse } from "@/types/payments";

export const dynamic = "force-dynamic";

/**
 * POST /api/express/quote { items, couponCode?, postalCode, date, windowId? }
 * Prices an express purchase for the wallet sheet: called when the sheet opens and on
 * every `shippingaddresschange` (the wallet only reveals PLZ, city and country until the
 * customer pays). Validates the PLZ against the delivery zones and the chosen day/window
 * for that zone and returns the server-side totals (same `priceOrder` as the order).
 * `{ ok: false, code }` → the browser rejects the address with a translated message.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "express-quote", limit: 60, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  if (!stripeConfigured()) return NextResponse.json({ ok: false, code: "unavailable", message: "Express-Kauf ist derzeit nicht verfügbar." } satisfies ExpressQuoteResponse, { status: 404 });
  const read = await readJson(req);
  if (!read.ok || !read.body || typeof read.body !== "object" || Array.isArray(read.body)) return invalidRequest();
  const body = read.body as Record<string, unknown>;

  const settings = await getSettings();
  const items = parseOrderItems(body.items, { greetingMaxChars: settings.greetingCard.maxChars });
  if (!items.ok) return NextResponse.json({ ok: false, code: "items", message: items.message } satisfies ExpressQuoteResponse, { status: items.status });
  const zip = normalizePostalCode(cleanString(body.postalCode, 10) ?? "");
  if (!isValidAustrianPostalCode(zip)) return NextResponse.json({ ok: false, code: "zone", message: "In dieses Gebiet liefern wir derzeit leider noch nicht." } satisfies ExpressQuoteResponse, { status: 400 });
  const date = cleanString(body.date, 10) ?? "";
  const windowId = cleanString(body.windowId, 40);
  const couponCode = cleanString(body.couponCode, 40)?.toUpperCase();
  const priced = await priceOrder({ items: items.items, zip, date, windowId, couponCode });
  if (!priced.ok) return NextResponse.json({ ok: false, code: priced.code, message: priced.message } satisfies ExpressQuoteResponse, { status: priced.status });
  const res: ExpressQuoteResponse = {
    ok: true,
    postalCode: zip,
    zoneName: priced.zone.name,
    windowLabel: priced.window?.label,
    total: priced.totals.total,
    delivery: priced.totals.delivery,
    goods: Math.round((priced.totals.total - priced.totals.delivery) * 100) / 100,
  };
  return NextResponse.json(res);
}
