import { NextResponse } from "next/server";
import { getCoupons, getSettings } from "@/lib/cms";
import { getLocalNow } from "@/lib/delivery";
import { validateCoupon } from "@/lib/pricing";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/coupons/validate  { code: string, subtotal: number }
 * Returns { ok: true, coupon } or { ok: false, error }.
 * The final discount is recomputed server-side when the order is created.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "coupons-validate", limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  let body: { code?: unknown; subtotal?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const subtotal = typeof body.subtotal === "number" && Number.isFinite(body.subtotal) ? body.subtotal : 0;
  if (!code) return NextResponse.json({ ok: false, error: "Bitte gib einen Gutscheincode ein." }, { status: 400 });

  const [coupons, settings] = await Promise.all([getCoupons(), getSettings()]);
  const coupon = coupons.find((c) => c.code.toUpperCase() === code) ?? null;
  const today = getLocalNow(settings.timezone).date;
  const v = validateCoupon(coupon, subtotal, today);
  if (!v.ok || !coupon) return NextResponse.json({ ok: false, error: v.error ?? "Dieser Code ist uns nicht bekannt." });
  return NextResponse.json({ ok: true, coupon });
}
