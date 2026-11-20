import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { MAX_DRAFT_BODY, parseDraftInput, upsertCheckoutDraft } from "@/lib/checkout-drafts";

export const dynamic = "force-dynamic";

/**
 * POST /api/checkout/draft
 * Body: { id, source: "checkout" | "express", step?, locale?, items, couponCode?,
 *         contact?: { firstName, lastName, email, phone }, recipient?, delivery?: { date, windowId? },
 *         express?: { wallet?, postalCode?, city?, country? }, website? (honeypot) }
 *
 * "Abgebrochene Kasse": snapshot of a checkout that has not become an order yet (payment
 * step reached, or the Express-Kauf wallet sheet was closed). Upserted by `id` (random,
 * kept in the browser's sessionStorage) – see `src/lib/checkout-drafts.ts`. Checkout
 * drafts need a valid e-mail OR phone; bodies over 16 KB are refused. Best effort for the
 * browser: the answer carries no data.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "checkout-draft", limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (raw.length > MAX_DRAFT_BODY) return NextResponse.json({ ok: false }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = parseDraftInput(body);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: parsed.message }, { status: parsed.status });
  if ("ignored" in parsed) return NextResponse.json({ ok: true });
  try {
    await upsertCheckoutDraft(parsed.input);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[drafts] saving a checkout draft failed", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
