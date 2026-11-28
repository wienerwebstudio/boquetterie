import { NextResponse } from "next/server";
import { getDeliveryZones, getSettings, getProductBySlug } from "@/lib/cms";
import { findZone, getAvailableDays, normalizePostalCode, isValidAustrianPostalCode, getLocalNow, describeZone } from "@/lib/delivery";
import { enforceRateLimit } from "@/lib/rate-limit";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { loadMessages } from "@/i18n/messages";

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export const dynamic = "force-dynamic";

/**
 * GET /api/delivery/check?plz=1010[&product=amour][&locale=en]
 * Returns the zone (if any) and all deliverable days for the next weeks.
 * `locale` picks the language of `message` and `summary.days` (German by default).
 */
export async function GET(req: Request) {
  const limited = enforceRateLimit(req, { scope: "delivery-check", limit: 60, windowMs: 60 * 1000 });
  if (limited) return limited;
  const url = new URL(req.url);
  const plz = normalizePostalCode(url.searchParams.get("plz") ?? "");
  const productSlug = url.searchParams.get("product");
  const requested = url.searchParams.get("locale");
  const t = (await loadMessages(isLocale(requested) ? requested : DEFAULT_LOCALE)).checkout;
  if (!isValidAustrianPostalCode(plz)) {
    return NextResponse.json({ ok: false, error: "invalid", message: t.deliveryCheck.invalidPostalCode }, { status: 400 });
  }
  const [zones, settings] = await Promise.all([getDeliveryZones(), getSettings()]);
  const zone = findZone(plz, zones);
  if (!zone) {
    return NextResponse.json({
      ok: true, available: false, postalCode: plz, zone: null, days: [],
      message: t.deliveryCheck.notDelivered,
    });
  }
  const product = productSlug ? await getProductBySlug(productSlug) : null;
  const now = getLocalNow(settings.timezone);
  const days = getAvailableDays({ zone, settings, product, now });
  return NextResponse.json({
    ok: true, available: true, postalCode: plz, zone, days,
    summary: describeZone(zone, WEEKDAY_KEYS.map((k) => t.weekdaysShort[k])),
    sameDayToday: days.some((d) => d.sameDay),
    now,
  });
}
