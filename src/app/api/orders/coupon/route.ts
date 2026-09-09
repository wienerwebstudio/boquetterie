import { NextResponse } from "next/server";
import { getCoupons, getSettings } from "@/lib/cms";
import { getLocalNow } from "@/lib/delivery";
import { validateCoupon } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders/coupon?code=WILLKOMMEN10[&subtotal=79.9]
 * Returns the definition of ONE coupon (never the whole list) so the checkout
 * summary can compute the discount with the shared pricing engine.
 * The order endpoint re-validates the coupon regardless of this answer.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "").trim().toUpperCase().slice(0, 40);
  const subtotalParam = Number(url.searchParams.get("subtotal"));
  const subtotal = Number.isFinite(subtotalParam) ? subtotalParam : 0;
  if (!code) return NextResponse.json({ ok: false, coupon: null, message: "Bitte gib einen Code ein." }, { status: 400 });

  const [coupons, settings] = await Promise.all([getCoupons(), getSettings()]);
  const coupon = coupons.find((c) => c.code.toUpperCase() === code) ?? null;
  const v = validateCoupon(coupon, subtotal, getLocalNow(settings.timezone).date);
  if (!coupon || !v.ok) {
    return NextResponse.json({ ok: false, coupon: null, message: v.error ?? "Dieser Code ist nicht gültig." });
  }
  return NextResponse.json({ ok: true, coupon });
}
