import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/cms";
import { isEmail } from "@/lib/order-payload";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders/lookup  { orderId, email }
 * Finds an order by number + the e-mail the customer used and returns its tracking token.
 * The response is identical for "unknown order" and "wrong e-mail" so nothing leaks.
 */
export async function POST(req: Request) {
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
  if (!order || order.customer.email.toLowerCase() !== email) {
    return NextResponse.json(
      { ok: false, message: "Wir konnten keine Bestellung mit dieser Nummer und E-Mail-Adresse finden. Bitte prüfe beide Angaben." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, id: order.id, token: order.token });
}
