/**
 * Delivery engine.
 *
 * Pure functions – usable on server and client. All decisions (same-day, next
 * available day, fees, windows) derive from the admin-editable zone config and
 * settings; nothing here is hard-coded to a specific district.
 */
import type { DeliveryZone, DeliveryWindow, ISODate, Product, SiteSettings } from "@/types";

export interface LocalNow {
  date: ISODate;
  minutes: number; // minutes since midnight in the shop timezone
  weekday: number; // 0 = Sunday
}

export function getLocalNow(timezone = "Europe/Vienna", at: Date = new Date()): LocalNow {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]));
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    weekday: weekdays.indexOf(parts.weekday),
  };
}

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12));
  return dt.toISOString().slice(0, 10);
}

export function weekdayOf(iso: ISODate) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

export function normalizePostalCode(input: string) {
  return input.replace(/\D/g, "").slice(0, 4);
}

export function isValidAustrianPostalCode(plz: string) {
  return /^[1-9]\d{3}$/.test(plz);
}

/** Does the zone's postal code list (values or "from-to" ranges) contain the PLZ? */
export function zoneContains(zone: DeliveryZone, plz: string) {
  const n = Number(plz);
  if (!Number.isFinite(n)) return false;
  return zone.postalCodes.some((entry) => {
    const [from, to] = entry.split("-").map((s) => Number(s.trim()));
    if (Number.isFinite(to)) return n >= from && n <= to;
    return n === from;
  });
}

export function findZone(plz: string, zones: DeliveryZone[]) {
  const normalized = normalizePostalCode(plz);
  if (!isValidAustrianPostalCode(normalized)) return null;
  return zones.find((z) => z.active && zoneContains(z, normalized)) ?? null;
}

export interface DeliveryDay {
  date: ISODate;
  sameDay: boolean;
  windows: DeliveryWindow[];
}

export interface AvailabilityOptions {
  zone: DeliveryZone;
  settings: Pick<SiteSettings, "blackoutDates" | "sameDayEnabled" | "timezone">;
  now?: LocalNow;
  product?: Pick<Product, "sameDayCapable" | "deliverable"> | null;
  horizonDays?: number;
}

/**
 * Compute every deliverable day inside the horizon. Rules:
 *  - weekday must be in zone.deliveryDays and not a blackout date
 *  - same-day only if zone.sameDay && settings.sameDayEnabled && (product?.sameDayCapable ?? true)
 *    && now < zone.sameDayCutoff
 *  - otherwise: first day = today + leadDays, +1 if current time is past zone.cutoff
 */
export function getAvailableDays(opts: AvailabilityOptions): DeliveryDay[] {
  const { zone, settings, product } = opts;
  const now = opts.now ?? getLocalNow(settings.timezone);
  const horizon = opts.horizonDays ?? 45;
  const days: DeliveryDay[] = [];
  if (!zone.active || product?.deliverable === false) return days;

  const activeWindows = zone.windows.filter((w) => w.active);
  const blackout = new Set(settings.blackoutDates);
  const isDeliveryDay = (iso: ISODate) => zone.deliveryDays.includes(weekdayOf(iso)) && !blackout.has(iso);

  const sameDayAllowed =
    settings.sameDayEnabled && zone.sameDay && (product?.sameDayCapable ?? true) &&
    now.minutes < toMinutes(zone.sameDayCutoff) && isDeliveryDay(now.date);

  if (sameDayAllowed) {
    days.push({
      date: now.date,
      sameDay: true,
      windows: activeWindows.filter((w) => toMinutes(w.to) > now.minutes + 60),
    });
  }

  let lead = Math.max(zone.leadDays, sameDayAllowed ? 1 : 0);
  if (lead === 0) lead = 1; // day 0 handled above
  if (now.minutes >= toMinutes(zone.cutoff)) lead += 1;

  for (let i = lead; i <= horizon; i++) {
    const iso = addDays(now.date, i);
    if (isDeliveryDay(iso)) days.push({ date: iso, sameDay: false, windows: activeWindows });
  }
  return days;
}

export function isSameDayAvailable(opts: AvailabilityOptions) {
  return getAvailableDays({ ...opts, horizonDays: 0 }).some((d) => d.sameDay);
}

export function quoteDelivery(zone: DeliveryZone, subtotal: number, windowId?: string) {
  const base = zone.freeFrom !== null && subtotal >= zone.freeFrom ? 0 : zone.fee;
  const window = zone.windows.find((w) => w.id === windowId);
  const surcharge = window?.surcharge ?? 0;
  return {
    fee: base + surcharge,
    baseFee: base,
    surcharge,
    freeFrom: zone.freeFrom,
    isFree: base === 0,
    belowMinOrder: subtotal < zone.minOrder,
    minOrder: zone.minOrder,
  };
}

export function describeSameDayCutoff(zone: DeliveryZone) {
  return `Bestellung bis ${zone.sameDayCutoff} Uhr`;
}

/** Human readable summary of a zone for delivery pages and the PLZ check. */
export function describeZone(zone: DeliveryZone) {
  const names = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const days = zone.deliveryDays.map((d) => names[d]).join(", ");
  return {
    days,
    fee: zone.fee,
    freeFrom: zone.freeFrom,
    sameDay: zone.sameDay,
    sameDayCutoff: zone.sameDayCutoff,
    cutoff: zone.cutoff,
  };
}

/**
 * Is a same-day delivery possible right now in at least one zone (independent of a
 * specific address)? Used for the "Heute lieferbar" badge on listing pages that
 * don't know the recipient's PLZ yet.
 */
export function isSameDayPossibleNow(zones: DeliveryZone[], settings: Pick<SiteSettings, "blackoutDates" | "sameDayEnabled" | "timezone">, now?: LocalNow) {
  if (!settings.sameDayEnabled) return false;
  const local = now ?? getLocalNow(settings.timezone);
  return zones.some((z) => z.active && z.sameDay && getAvailableDays({ zone: z, settings, now: local, horizonDays: 0 }).some((d) => d.sameDay));
}
