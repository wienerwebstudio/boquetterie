import "server-only";
import { getOrderById, getOrders, getSettings, updateOrder } from "@/lib/cms";
import { sendOrderStatusUpdate } from "@/lib/mail";
import type { Order, OrderCourier } from "@/types";
import {
  RIDERX_STATUS_LABELS, buildDeliveryRequest, isViennaPostalCode, mapRiderxStatus, pickNominatim, pickViennaAddress, planPickup, shouldApplyStatus,
  type Coordinates, type RiderxDeliveryRequest, type RiderxPickupAddress,
} from "./riderx-core";

/**
 * RiderX courier booking. Env-activated: without RIDERX_CLIENT_ID/SECRET and a
 * pickup address nothing is booked and orders are handled by hand, as before.
 * See docs/COURIER.md.
 */

interface RiderxConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  packageId: number;
  pickup: RiderxPickupAddress;
  absent: RiderxDeliveryRequest["absent_receiver_instructions"];
  prepMinutes: number;
  defaultFrom: string;
  autoBook: boolean;
}

function env(name: string) {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

export function riderxConfig(): RiderxConfig | null {
  const clientId = env("RIDERX_CLIENT_ID");
  const clientSecret = env("RIDERX_CLIENT_SECRET");
  const street = env("RIDERX_PICKUP_STREET");
  const houseNumber = env("RIDERX_PICKUP_HOUSE_NUMBER");
  const zip = env("RIDERX_PICKUP_ZIP");
  if (!clientId || !clientSecret || !street || !houseNumber || !zip) return null;
  const absent = env("RIDERX_ABSENT_INSTRUCTIONS");
  return {
    baseUrl: (env("RIDERX_API_URL") ?? "https://t3.riderx.me").replace(/\/$/, ""),
    clientId,
    clientSecret,
    packageId: Number(env("RIDERX_PACKAGE_ID") ?? 2),
    pickup: {
      name: env("RIDERX_PICKUP_NAME") ?? "Blumora",
      phone: env("RIDERX_PICKUP_PHONE") ?? "",
      street, houseNumber, zip,
      city: env("RIDERX_PICKUP_CITY") ?? "Wien",
      extra: env("RIDERX_PICKUP_EXTRA"),
      latitude: env("RIDERX_PICKUP_LAT"),
      longitude: env("RIDERX_PICKUP_LNG"),
    },
    absent: absent === "drop_by_door" || absent === "destroy" ? absent : "drop_by_neighbour",
    prepMinutes: Number(env("RIDERX_PREP_MINUTES") ?? 60),
    defaultFrom: env("RIDERX_DEFAULT_PICKUP") ?? "09:00",
    autoBook: env("RIDERX_AUTO_BOOK") !== "false",
  };
}

export function courierEnabled() {
  return riderxConfig() !== null;
}

/* ---------------- HTTP ---------------- */

let tokenCache: { token: string; expiresAt: number; key: string } | null = null;

async function getToken(cfg: RiderxConfig, force = false): Promise<string> {
  const key = `${cfg.baseUrl}|${cfg.clientId}`;
  if (!force && tokenCache && tokenCache.key === key && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const res = await fetch(`${cfg.baseUrl}/api/v2/partner/oauth2/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`RiderX-Anmeldung fehlgeschlagen (${res.status}).`);
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("RiderX-Anmeldung lieferte kein Token.");
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000, key };
  return data.access_token;
}

interface RiderxEnvelope<T> { status?: boolean; message?: string; data?: T }

async function call<T>(cfg: RiderxConfig, method: "GET" | "POST" | "PUT", path: string, body?: unknown): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getToken(cfg, attempt > 0);
    const res = await fetch(`${cfg.baseUrl}/api/v2/partner/${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body !== undefined && { "Content-Type": "application/json" }) },
      ...(body !== undefined && { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 401 && attempt === 0) continue;
    const text = await res.text();
    let json: RiderxEnvelope<T> | null = null;
    try { json = JSON.parse(text) as RiderxEnvelope<T>; } catch { /* non-JSON error page */ }
    if (!res.ok || json?.status === false) {
      const reason = json?.message || `HTTP ${res.status}`;
      throw new Error(res.status === 402 ? `RiderX: Guthaben reicht nicht (${reason}).` : `RiderX: ${reason}`);
    }
    return (json?.data ?? json) as T;
  }
  throw new Error("RiderX: Anmeldung abgelehnt.");
}

interface RiderxDelivery { id: number; status?: string; pickup_schedule?: string | null }

/* ---------------- Geocoding (RiderX needs coordinates) ---------------- */

async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T | null> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8_000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Address → coordinates. Vienna addresses go to the City of Vienna's open address
 * service (official, free); everything else, or a miss, to OpenStreetMap Nominatim.
 */
export async function geocode(street: string, houseNumber: string, zip: string, city: string): Promise<Coordinates | null> {
  const number = houseNumber.split(/[/\s]/)[0]; // "12/3" → "12": Stiege/Tür are not part of the lookup
  if (isViennaPostalCode(zip)) {
    const q = encodeURIComponent(`${street} ${number}`);
    const hit = pickViennaAddress(await getJson(`https://data.wien.gv.at/daten/OGDAddressService.svc/GetAddressInfo?Address=${q}&crs=EPSG:4326`), zip);
    if (hit) return hit;
  }
  const params = new URLSearchParams({ street: `${number} ${street}`, postalcode: zip, city, countrycodes: "at", format: "jsonv2", limit: "1" });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return pickNominatim(await getJson(`https://nominatim.openstreetmap.org/search?${params}`, { "User-Agent": `Blumora-Shop/1.0${site ? ` (+${site})` : ""}` }));
}

let pickupCoords: { key: string; coords: Coordinates } | null = null;

async function pickupCoordinates(p: RiderxPickupAddress): Promise<Coordinates | null> {
  if (p.latitude && p.longitude) return { latitude: p.latitude, longitude: p.longitude };
  const key = `${p.street}|${p.houseNumber}|${p.zip}`;
  if (pickupCoords?.key === key) return pickupCoords.coords;
  const coords = await geocode(p.street, p.houseNumber, p.zip, p.city);
  if (coords) pickupCoords = { key, coords };
  return coords;
}

/* ---------------- Order side effects ---------------- */

function courierState(prev: OrderCourier | undefined, patch: Partial<OrderCourier>): OrderCourier {
  return { provider: "riderx", status: "booking", ...prev, ...patch, updatedAt: new Date().toISOString() };
}

const BOOKED = (c?: OrderCourier) => Boolean(c && c.deliveryId && c.status !== "cancel" && c.status !== "failed");

export type CourierResult = { ok: true; message: string } | { ok: false; message: string };

/**
 * Books a rider for a paid order. Idempotent: an order that is already booked
 * (or being booked) is left alone, so the confirm endpoint and the payment
 * webhook can both call it.
 */
export async function bookCourier(orderId: string, opts: { manual?: boolean } = {}): Promise<CourierResult> {
  const cfg = riderxConfig();
  if (!cfg) return { ok: false, message: "RiderX ist nicht eingerichtet (RIDERX_* fehlt)." };
  if (!opts.manual && !cfg.autoBook) return { ok: false, message: "Automatische Buchung ist ausgeschaltet." };

  // Claim the order first so a parallel call does not book a second rider.
  let claimed = false;
  const order = await updateOrder(orderId, (o) => {
    const inFlight = o.courier?.status === "booking" && Date.now() - Date.parse(o.courier.updatedAt) < 2 * 60_000;
    if (BOOKED(o.courier) || inFlight || o.payment.status !== "paid" || o.status === "cancelled") return o;
    claimed = true;
    return { ...o, courier: courierState(undefined, { status: "booking" }) };
  });
  if (!order) return { ok: false, message: "Bestellung nicht gefunden." };
  if (!claimed) {
    if (BOOKED(order.courier)) return { ok: true, message: "Fahrer ist bereits gebucht." };
    return { ok: false, message: order.payment.status !== "paid" ? "Bestellung ist noch nicht bezahlt." : "Buchung läuft bereits oder Bestellung ist storniert." };
  }

  const settings = await getSettings();
  const plan = planPickup(order, new Date(), { prepMinutes: cfg.prepMinutes, defaultFrom: cfg.defaultFrom, timeZone: settings.timezone });
  if (!plan.ok) return fail(order, plan.reason);

  try {
    const r = order.recipient;
    const [receiverCoords, senderCoords] = await Promise.all([geocode(r.street, r.houseNumber, r.zip, r.city), pickupCoordinates(cfg.pickup)]);
    if (!senderCoords) return fail(order, "Abholadresse (RIDERX_PICKUP_*) wurde nicht gefunden – bitte RIDERX_PICKUP_LAT/LNG setzen.");
    if (!receiverCoords) return fail(order, `Lieferadresse „${r.street} ${r.houseNumber}, ${r.zip}" wurde nicht gefunden – bitte Adresse prüfen und erneut buchen.`);
    const request = buildDeliveryRequest(order, {
      packageId: cfg.packageId, pickup: cfg.pickup, plan, absent: cfg.absent, brand: settings.brand.name, timeZone: settings.timezone, receiverCoords, senderCoords,
    });
    const delivery = await call<RiderxDelivery>(cfg, "POST", "delivery/create", request);
    const pickupAt = delivery.pickup_schedule ?? request.pickup_schedule;
    const note = `Fahrer gebucht (RiderX #${delivery.id}), Abholung ${pickupAt.slice(11, 16)} Uhr${plan.late ? " – knapp im Lieferfenster" : ""}`;
    await updateOrder(order.id, (o) => ({
      ...o,
      courier: courierState(o.courier, { status: delivery.status || "created", deliveryId: delivery.id, pickupAt, bookedAt: new Date().toISOString(), error: undefined }),
      history: [...o.history, { status: o.status, at: new Date().toISOString(), note }],
    }));
    return { ok: true, message: note };
  } catch (err) {
    return fail(order, err instanceof Error ? err.message : "RiderX-Buchung fehlgeschlagen.");
  }
}

async function fail(order: Order, reason: string): Promise<CourierResult> {
  console.error(`[courier] ${order.id}: ${reason}`);
  await updateOrder(order.id, (o) => ({
    ...o,
    courier: courierState(o.courier, { status: "failed", error: reason }),
    history: [...o.history, { status: o.status, at: new Date().toISOString(), note: `Kurier nicht gebucht: ${reason}` }],
  }));
  return { ok: false, message: reason };
}

/** Never throws – used right after a payment so a courier problem can't fail the payment. */
export async function bookCourierSafely(orderId: string) {
  try {
    if (!courierEnabled()) return;
    await bookCourier(orderId);
  } catch (err) {
    console.error("[courier] booking crashed", err);
  }
}

/**
 * Cancels the RiderX delivery. Free until 30 min before a planned pickup
 * (within 5 min for "sofort") – RiderX decides; we report its answer.
 */
export async function cancelCourier(orderId: string): Promise<CourierResult> {
  const cfg = riderxConfig();
  if (!cfg) return { ok: false, message: "RiderX ist nicht eingerichtet." };
  const order = await getOrderById(orderId);
  if (!order) return { ok: false, message: "Bestellung nicht gefunden." };
  if (!order.courier?.deliveryId || !BOOKED(order.courier)) return { ok: false, message: "Es ist kein Fahrer gebucht." };
  try {
    const delivery = await call<RiderxDelivery>(cfg, "PUT", "delivery/cancel", { delivery_id: order.courier.deliveryId });
    await updateOrder(order.id, (o) => ({
      ...o,
      courier: courierState(o.courier, { status: delivery.status || "cancel", error: undefined }),
      history: [...o.history, { status: o.status, at: new Date().toISOString(), note: `Fahrer storniert (RiderX #${order.courier?.deliveryId})` }],
    }));
    return { ok: true, message: "Fahrer storniert." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Stornierung fehlgeschlagen." };
  }
}

/* ---------------- Webhook ---------------- */

export interface RiderxWebhookEvent {
  event?: string;
  delivery?: { id?: number; status?: string };
}

/** Applies a verified RiderX webhook. Unknown events are acknowledged and ignored. */
export async function applyRiderxEvent(evt: RiderxWebhookEvent): Promise<{ orderId: string | null; applied: boolean }> {
  if (evt.event !== "delivery.created" && evt.event !== "delivery.updated") return { orderId: null, applied: false };
  const id = evt.delivery?.id;
  const status = evt.delivery?.status;
  if (!id || !status) return { orderId: null, applied: false };
  const order = (await getOrders()).find((o) => o.courier?.deliveryId === id);
  if (!order) return { orderId: null, applied: false };

  const next = mapRiderxStatus(status);
  const settings = await getSettings();
  const changed = { status: false };
  const updated = await updateOrder(order.id, (o) => {
    if (o.courier?.status === status) return o;
    const label = RIDERX_STATUS_LABELS[status] ?? status;
    const apply = next !== null && shouldApplyStatus(o.status, next);
    changed.status = apply;
    return {
      ...o,
      status: apply && next ? next : o.status,
      courier: courierState(o.courier, { status }),
      history: [...o.history, { status: apply && next ? next : o.status, at: new Date().toISOString(), note: `RiderX: ${label}` }],
    };
  });

  if (updated && changed.status) {
    const def = settings.orderStatuses.find((s) => s.key === updated.status);
    if (def?.customerVisible) await sendOrderStatusUpdate(updated).catch((err) => console.error("[mail] courier status update failed", err));
  }
  return { orderId: order.id, applied: true };
}
