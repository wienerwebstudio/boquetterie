import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getOrderById, updateOrder } from "@/lib/cms";
import { sendPaymentProblemNotice } from "@/lib/mail";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const KINDS = { load_error: "Zahlungsfeld lädt nicht", load_timeout: "Zahlungsfeld nach 20 s nicht geladen", confirm_error: "Fehler beim Bezahlen" } as const;
type Kind = keyof typeof KINDS;
const MAX_NOTES_PER_ORDER = 5;
const NOTE_PREFIX = "Zahlungsproblem im Browser";

function tokenMatches(expected: string, given: unknown) {
  if (typeof given !== "string" || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

/**
 * POST /api/payments/stripe/client-event { orderId, token, kind, method?, message? }
 * The browser reports a payment problem that never reaches Stripe's logs (form not
 * loading, error on "Jetzt bezahlen"). Noted in the order history (max. 5 per order);
 * the team gets one mail per order. Changes nothing about the payment itself.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "payments-client-event", limit: 20, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  let body: { orderId?: unknown; token?: unknown; kind?: unknown; method?: unknown; message?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const kind = typeof body.kind === "string" && body.kind in KINDS ? (body.kind as Kind) : null;
  const orderId = typeof body.orderId === "string" ? body.orderId.trim().toUpperCase().slice(0, 20) : "";
  if (!kind || !orderId) return NextResponse.json({ ok: false }, { status: 400 });
  const order = await getOrderById(orderId);
  if (!order || !tokenMatches(order.token, body.token)) return NextResponse.json({ ok: false }, { status: 404 });
  if (order.payment.status === "paid") return NextResponse.json({ ok: true });

  const clean = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\r\n\t]+/g, " ").trim().slice(0, n) : "");
  const method = clean(body.method, 20);
  const message = clean(body.message, 300);
  const device = clean(req.headers.get("user-agent"), 160);
  const note = `${NOTE_PREFIX}: ${KINDS[kind]}${method ? ` (${method})` : ""}${message ? ` – ${message}` : ""}${device ? ` · Gerät: ${device}` : ""}`;

  let first = false;
  await updateOrder(order.id, (o) => {
    const existing = o.history.filter((h) => h.note?.startsWith(NOTE_PREFIX)).length;
    if (existing >= MAX_NOTES_PER_ORDER) return o;
    first = existing === 0;
    return { ...o, history: [...o.history, { status: o.status, at: new Date().toISOString(), note }] };
  });
  if (first) await sendPaymentProblemNotice(order, note);
  return NextResponse.json({ ok: true });
}
