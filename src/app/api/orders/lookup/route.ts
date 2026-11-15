import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { getOrderById } from "@/lib/cms";
import { isEmail } from "@/lib/order-payload";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

/** Case-insensitive, constant-time comparison of two e-mail addresses (hashed first, so the length does not leak either). */
function sameEmail(a: string, b: string) {
  return timingSafeEqual(sha256(a.trim().toLowerCase()), sha256(b.trim().toLowerCase()));
}

/**
 * POST /api/orders/lookup  { orderId, email }
 * Finds an order by number + the e-mail the customer used and returns its tracking token.
 * The response is identical for "unknown order" and "wrong e-mail" so nothing leaks, and
 * the strict limit (5 tries per IP in 10 minutes) keeps order numbers from being enumerated.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "orders-lookup", limit: 5, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  let body: { orderId?: unknown; email?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  }
  const rawId = typeof body.orderId === "string" ? body.orderId.trim().toUpperCase().replace(/\s+/g, "") : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const id = rawId.startsWith("BQ-") ? rawId : rawId.length === 6 ? `BQ-${rawId}` : rawId;

  const errors: Record<string, string> = {};
  if (!/^BQ-[A-Z0-9]{6}$/.test(id)) errors.orderId = "Bitte gib eine gültige Bestellnummer ein (z. B. BQ-7K2M9Q).";
  if (!isEmail(email)) errors.email = "Bitte gib eine gültige E-Mail-Adresse ein.";
  if (Object.keys(errors).length) return NextResponse.json({ ok: false, message: "Bitte prüfe deine Eingaben.", errors }, { status: 400 });

  const order = await getOrderById(id);
  // Compared even when there is no order, so both cases take the same path.
  const emailMatches = sameEmail(order?.customer?.email ?? "", email);
  if (!order || !emailMatches) {
    return NextResponse.json(
      { ok: false, message: "Wir konnten keine Bestellung mit dieser Nummer und E-Mail-Adresse finden. Bitte prüfe beide Angaben." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, id: order.id, token: order.token });
}
