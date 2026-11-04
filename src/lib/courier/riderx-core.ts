/**
 * RiderX courier – pure helpers (no I/O): pickup time, request payload,
 * phone parsing, webhook signature and status mapping. The HTTP client and the
 * order side effects live in `./riderx.ts` and `./index.ts`.
 *
 * Agreed with RiderX (Nov 2026): a pickup booked at the start of a delivery
 * window is delivered within that window; pickups only between 07:00 and 21:15
 * (later ones carry a night surcharge); 24/7 incl. Sundays and holidays.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Order, OrderStatus } from "@/types";

export const RIDERX_PICKUP_FROM = "07:00";
export const RIDERX_PICKUP_UNTIL = "21:15";

export interface RiderxPickupAddress {
  name: string;
  phone: string;
  street: string; // "Hauptstraße"
  houseNumber: string; // "12"
  zip: string;
  city: string;
  extra?: string;
  latitude?: string;
  longitude?: string;
}

export interface RiderxPhone {
  country_symbol: string;
  country_code: string;
  number: string;
}

export interface RiderxAddressJson {
  full_address: string;
  house_number: string;
  postal_code: string;
  address_extra_details?: string;
}

export interface RiderxDeliveryRequest {
  deliver_type: "to_person" | "just_to_location";
  delivery_package_id: number;
  pickup_schedule: string;
  sender_full_name: string;
  sender_phone?: RiderxPhone;
  sender_address_details: RiderxAddressJson;
  sender_latitude: string;
  sender_longitude: string;
  receiver_full_name: string;
  receiver_phone?: RiderxPhone;
  receiver_address_details: RiderxAddressJson;
  receiver_latitude: string;
  receiver_longitude: string;
  description: string;
  tags: string[];
  absent_receiver_instructions: "drop_by_door" | "drop_by_neighbour" | "destroy";
}

/* ---------------- Time ---------------- */

function hhmmToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** UTC offset of `timeZone` at `at`, in minutes (e.g. 60 for CET, 120 for CEST). */
function offsetMinutes(timeZone: string, at: Date) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(name);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** Local wall time in `timeZone` → instant. Handles the DST switch by re-checking the offset. */
export function localToDate(date: string, hhmm: string, timeZone = "Europe/Vienna"): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  let t = asUtc - offsetMinutes(timeZone, new Date(asUtc)) * 60_000;
  t = asUtc - offsetMinutes(timeZone, new Date(t)) * 60_000;
  return new Date(t);
}

/** ISO 8601 with the zone's offset, e.g. "2026-11-05T09:00:00+01:00". */
export function toZonedIso(at: Date, timeZone = "Europe/Vienna") {
  const off = offsetMinutes(timeZone, at);
  const local = new Date(at.getTime() + off * 60_000);
  const sign = off < 0 ? "-" : "+";
  const abs = Math.abs(off);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${local.toISOString().slice(0, 19)}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

export type PickupPlan =
  | { ok: true; at: Date; late: boolean }
  | { ok: false; reason: string };

/**
 * When the rider should collect the bouquet: at the start of the booked window,
 * but never earlier than `prepMinutes` from now (the florist needs time to bind).
 * `late` = the pickup leaves less than an hour of the window.
 */
export function planPickup(order: Pick<Order, "delivery">, now: Date, opts: { prepMinutes: number; defaultFrom: string; timeZone?: string }): PickupPlan {
  const tz = opts.timeZone ?? "Europe/Vienna";
  const from = order.delivery.windowFrom ?? opts.defaultFrom;
  if (hhmmToMinutes(from) < hhmmToMinutes(RIDERX_PICKUP_FROM)) return { ok: false, reason: `Abholung vor ${RIDERX_PICKUP_FROM} Uhr ist nicht möglich.` };
  const windowStart = localToDate(order.delivery.date, from, tz);
  const windowEnd = order.delivery.windowTo ? localToDate(order.delivery.date, order.delivery.windowTo, tz) : null;
  const lastPickup = localToDate(order.delivery.date, RIDERX_PICKUP_UNTIL, tz);
  const earliest = new Date(now.getTime() + opts.prepMinutes * 60_000);
  const at = earliest > windowStart ? earliest : windowStart;

  if (windowEnd && at >= windowEnd) return { ok: false, reason: "Das Lieferfenster ist schon vorbei – bitte mit der Kund:in klären und manuell buchen." };
  if (at > lastPickup) return { ok: false, reason: `Abholung nach ${RIDERX_PICKUP_UNTIL} Uhr ist nicht vorgesehen (Nachtzuschlag) – bitte manuell klären.` };
  const late = windowEnd ? windowEnd.getTime() - at.getTime() < 60 * 60_000 : false;
  return { ok: true, at, late };
}

/* ---------------- Geocoding ---------------- */

export interface Coordinates { latitude: string; longitude: string }

export function isViennaPostalCode(zip: string) {
  return /^1(0[1-9]|1\d|2[0-3])0$/.test(zip);
}

interface WienFeature { geometry?: { coordinates?: [number, number] }; properties?: { PostalCode?: string; Kategorie?: string } }

/** Picks the hit of the City of Vienna address service that is a real address in the order's postal code. */
export function pickViennaAddress(data: { features?: WienFeature[] } | null, zip: string): Coordinates | null {
  const hit = data?.features?.find((f) => f.properties?.Kategorie === "Adresse" && f.properties?.PostalCode === zip && f.geometry?.coordinates);
  if (!hit?.geometry?.coordinates) return null;
  const [lng, lat] = hit.geometry.coordinates;
  return { latitude: lat.toFixed(6), longitude: lng.toFixed(6) };
}

/** First Nominatim (OpenStreetMap) hit. */
export function pickNominatim(data: { lat?: string; lon?: string }[] | null): Coordinates | null {
  const hit = data?.[0];
  if (!hit?.lat || !hit.lon) return null;
  return { latitude: Number(hit.lat).toFixed(6), longitude: Number(hit.lon).toFixed(6) };
}

/* ---------------- Phone ---------------- */

const COUNTRY_CODES: Record<string, string> = {
  "43": "at", "49": "de", "41": "ch", "39": "it", "36": "hu", "420": "cz", "421": "sk", "386": "si", "385": "hr", "48": "pl", "40": "ro", "381": "rs", "90": "tr", "44": "gb", "33": "fr",
};

/** "+43 664 1234567", "0664/1234567", "0043 …" → RiderX phone object. Unknown formats → null. */
export function parsePhone(input: string): RiderxPhone | null {
  let s = input.replace(/[\s\-/().]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (/^0\d{5,}$/.test(s)) return { country_symbol: "at", country_code: "43", number: s.slice(1) };
  const m = /^\+(\d+)$/.exec(s);
  if (!m) return null;
  for (const len of [3, 2]) {
    const code = m[1].slice(0, len);
    if (COUNTRY_CODES[code]) {
      const number = m[1].slice(len).replace(/^0/, "");
      return number.length >= 5 && number.length <= 15 ? { country_symbol: COUNTRY_CODES[code], country_code: code, number } : null;
    }
  }
  return null;
}

/* ---------------- Payload ---------------- */

function clip(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function buildDeliveryRequest(order: Order, opts: {
  packageId: number;
  pickup: RiderxPickupAddress;
  plan: Extract<PickupPlan, { ok: true }>;
  receiverCoords: Coordinates;
  senderCoords: Coordinates;
  absent: RiderxDeliveryRequest["absent_receiver_instructions"];
  brand: string;
  timeZone?: string;
}): RiderxDeliveryRequest {
  const r = order.recipient;
  const p = opts.pickup;
  const items = order.lines.map((l) => `${l.quantity}× ${l.productName} (${l.sizeLabel})`).join(", ");
  const extraDetails = [r.company, r.addition].filter(Boolean).join(" · ");
  const description = clip(
    [`${opts.brand} ${order.id}: ${items}.`, "Blumen – aufrecht transportieren.", order.delivery.note ? `Hinweis: ${order.delivery.note}` : ""].filter(Boolean).join(" "),
    1000,
  );
  const senderPhone = parsePhone(p.phone);
  const receiverPhone = parsePhone(r.phone);
  return {
    deliver_type: "to_person",
    delivery_package_id: opts.packageId,
    pickup_schedule: toZonedIso(opts.plan.at, opts.timeZone),
    sender_full_name: clip(p.name, 100),
    ...(senderPhone && { sender_phone: senderPhone }),
    sender_address_details: {
      full_address: `${p.street} ${p.houseNumber}, ${p.zip} ${p.city}, Österreich`,
      house_number: p.houseNumber,
      postal_code: p.zip,
      ...(p.extra && { address_extra_details: p.extra }),
    },
    sender_latitude: opts.senderCoords.latitude,
    sender_longitude: opts.senderCoords.longitude,
    receiver_full_name: clip(`${r.firstName} ${r.lastName}`.trim(), 100),
    ...(receiverPhone && { receiver_phone: receiverPhone }),
    receiver_address_details: {
      full_address: `${r.street} ${r.houseNumber}, ${r.zip} ${r.city}, Österreich`,
      house_number: r.houseNumber,
      postal_code: r.zip,
      ...(extraDetails && { address_extra_details: clip(extraDetails, 200) }),
    },
    receiver_latitude: opts.receiverCoords.latitude,
    receiver_longitude: opts.receiverCoords.longitude,
    description,
    tags: ["fragile", "side_up"],
    absent_receiver_instructions: opts.absent,
  };
}

/* ---------------- Webhook ---------------- */

/**
 * `X-Service-Signature` = HMAC-SHA256(partner secret, raw body). RiderX has not
 * yet documented the encoding, so hex and base64 are both accepted.
 */
export function verifyRiderxSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const given = header.trim().replace(/^sha256=/i, "");
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const candidates = [Buffer.from(digest.toString("hex")), Buffer.from(digest.toString("base64")), Buffer.from(digest.toString("base64url"))];
  const g = Buffer.from(given.length === 64 ? given.toLowerCase() : given);
  return candidates.some((c) => c.length === g.length && timingSafeEqual(c, g));
}

export type RiderxStatus =
  | "created" | "reserved" | "reserve_approved" | "accepted" | "arrival" | "late_arrival" | "pickup" | "late_pickup"
  | "request_new_driver" | "shipment_destroyed" | "address_not_found" | "completed" | "late_completed" | "cancel";

export const RIDERX_STATUS_LABELS: Record<string, string> = {
  created: "Angelegt", reserved: "Reserviert", reserve_approved: "Reservierung bestätigt", accepted: "Fahrer zugewiesen",
  arrival: "Fahrer beim Floristen", late_arrival: "Fahrer verspätet beim Floristen", pickup: "Abgeholt – unterwegs",
  late_pickup: "Verspätet abgeholt – unterwegs", request_new_driver: "Neuer Fahrer angefordert", shipment_destroyed: "Sendung beschädigt",
  address_not_found: "Adresse nicht gefunden", completed: "Zugestellt", late_completed: "Verspätet zugestellt", cancel: "Storniert",
};

/** Which shop status a RiderX status leads to (null = no change). */
export function mapRiderxStatus(status: string): OrderStatus | null {
  switch (status) {
    case "pickup":
    case "late_pickup":
      return "in_transit";
    case "completed":
    case "late_completed":
      return "delivered";
    case "address_not_found":
    case "shipment_destroyed":
      return "undeliverable";
    default:
      return null;
  }
}

const FLOW: OrderStatus[] = ["received", "paid", "preparing", "arranging", "ready", "in_transit", "delivered"];

/** Only move forward; never touch cancelled/delivered orders; undeliverable only from an open order. */
export function shouldApplyStatus(current: OrderStatus, next: OrderStatus): boolean {
  if (current === next || current === "cancelled" || current === "delivered") return false;
  if (next === "undeliverable") return current !== "undeliverable";
  if (current === "undeliverable") return next === "delivered";
  return FLOW.indexOf(next) > FLOW.indexOf(current);
}
