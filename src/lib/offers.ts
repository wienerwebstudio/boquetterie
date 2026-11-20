import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { Offer, Order } from "@/types";
import { headers } from "next/headers";
import { addOffer, getOfferById, getOffers, getSettings, updateOffer } from "@/lib/cms";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/paths";
import type { OfferDraft } from "@/lib/offers-core";

/**
 * Individual offers – storage, public link and state changes (server only).
 * Rules (totals, status, validation) are in src/lib/offers-core.ts; paying creates an
 * order via `createOrderFromOffer` (src/lib/orders.ts). See docs/OFFERS.md.
 */

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** 24 random bytes → 32 base64url characters (192 bit): not guessable, not enumerable. */
export const OFFER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

export function newOfferToken() {
  return randomBytes(24).toString("base64url");
}

async function newOfferId() {
  const existing = new Set((await getOffers()).map((o) => o.id));
  for (let attempt = 0; attempt < 20; attempt++) {
    let s = "";
    for (let i = 0; i < 6; i++) s += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
    const id = `AN-${s}`;
    if (!existing.has(id)) return id;
  }
  throw new Error("Could not generate a unique offer id");
}

const digest = (s: string) => createHash("sha256").update(s).digest();

/**
 * Looks an offer up by its link token. Malformed tokens are rejected before any lookup;
 * the comparison runs over fixed-size digests with `timingSafeEqual` and visits every
 * offer, so response times do not reveal how much of a token matched.
 */
export async function findOfferByToken(token: unknown): Promise<Offer | null> {
  if (typeof token !== "string" || !OFFER_TOKEN_PATTERN.test(token)) return null;
  const wanted = digest(token);
  let hit: Offer | null = null;
  for (const offer of await getOffers()) {
    if (timingSafeEqual(digest(offer.token), wanted) && !hit) hit = offer;
  }
  return hit;
}

export function offerLocale(offer: Pick<Offer, "locale">): Locale {
  return isLocale(offer.locale) ? offer.locale : DEFAULT_LOCALE;
}

/** Public offer page path in the offer's language, e.g. `/en/angebot/<token>`. */
export function offerPath(offer: Pick<Offer, "token" | "locale">) {
  return localizePath(offerLocale(offer), `/angebot/${offer.token}`);
}

export function offerUrl(offer: Pick<Offer, "token" | "locale">, siteUrl: string) {
  return `${siteUrl.replace(/\/$/, "")}${offerPath(offer)}`;
}

/** Origin for customer links made in the admin: NEXT_PUBLIC_SITE_URL, in development the admin's own origin, else settings. */
export async function publicSiteUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) return `${h.get("x-forwarded-proto") ?? "http"}://${host}`;
  }
  return (await getSettings()).seo.siteUrl.replace(/\/$/, "");
}

/* ---------------- Writes ---------------- */

export async function createOffer(draft: OfferDraft, note = "Angebot angelegt"): Promise<Offer> {
  const at = new Date().toISOString();
  return addOffer({ ...draft, id: await newOfferId(), token: newOfferToken(), createdAt: at, updatedAt: at, status: "draft", history: [{ at, note }] });
}

/** Saves edited content. Paid or cancelled offers cannot be edited. */
export async function editOffer(id: string, draft: OfferDraft): Promise<{ ok: true; offer: Offer } | { ok: false; message: string }> {
  const current = await getOfferById(id);
  if (!current) return { ok: false, message: "Angebot nicht gefunden." };
  if (current.status === "paid" || current.status === "cancelled") return { ok: false, message: "Bezahlte oder stornierte Angebote können nicht mehr geändert werden." };
  const at = new Date().toISOString();
  const updated = await updateOffer(id, (o) => ({
    ...o, ...draft,
    // Optional fields that were cleared in the form must disappear.
    greeting: draft.greeting, floristNote: draft.floristNote, billing: draft.billing, internalNote: draft.internalNote,
    updatedAt: at,
    history: [...o.history, { at, note: o.sentAt ? "Angebot geändert – bitte erneut senden" : "Angebot geändert" }],
  }));
  return updated ? { ok: true, offer: updated } : { ok: false, message: "Angebot nicht gefunden." };
}

/** Records that the offer went out (mail or copied link). Drafts become "Gesendet". */
export async function markOfferSent(id: string, note: string, countAsSend = true) {
  const at = new Date().toISOString();
  return updateOffer(id, (o) => (o.status === "paid" || o.status === "cancelled" ? o : {
    ...o,
    status: "sent",
    ...(countAsSend ? { sentAt: at, sentCount: (o.sentCount ?? 0) + 1 } : {}),
    history: [...o.history, { at, note }],
  }));
}

/** First view of the public page (beacon from the browser – link previews do not count). */
export async function markOfferViewed(offer: Offer) {
  if (offer.viewedAt || offer.status !== "sent") return offer;
  const at = new Date().toISOString();
  return (await updateOffer(offer.id, (o) => (o.viewedAt || o.status !== "sent" ? o : { ...o, viewedAt: at, history: [...o.history, { at, note: "Von der Kund:in geöffnet" }] }))) ?? offer;
}

export async function cancelOffer(id: string) {
  const at = new Date().toISOString();
  return updateOffer(id, (o) => (o.status === "paid" || o.status === "cancelled" ? o : { ...o, status: "cancelled", cancelledAt: at, history: [...o.history, { at, note: "Angebot storniert" }] }));
}

export async function noteOffer(id: string, note: string) {
  const at = new Date().toISOString();
  return updateOffer(id, (o) => ({ ...o, history: [...o.history, { at, note }] }));
}

/**
 * Called once an order is paid: the offer it came from becomes "Bezahlt". A second
 * paid order for an already paid offer (should never happen – open payments are
 * cancelled first) is flagged loudly instead of overwriting the first.
 */
export async function markOfferPaidForOrder(order: Pick<Order, "id" | "offerId">): Promise<void> {
  if (!order.offerId) return;
  const at = new Date().toISOString();
  await updateOffer(order.offerId, (o) => {
    if (o.status === "paid") {
      if (o.orderId === order.id) return o;
      console.error(`[offers] ${o.id} already paid with ${o.orderId} – second payment ${order.id}`);
      return { ...o, history: [...o.history, { at, note: `ACHTUNG: zweite Zahlung ${order.id} – bitte erstatten` }] };
    }
    return { ...o, status: "paid", paidAt: at, orderId: order.id, history: [...o.history, { at, note: `Bezahlt – Bestellung ${order.id}` }] };
  });
}

/** Where a cancelled/failed provider payment of an offer order sends the customer back to. */
export async function offerReturnUrl(order: Pick<Order, "offerId">, siteUrl: string): Promise<string | null> {
  if (!order.offerId) return null;
  const offer = await getOfferById(order.offerId);
  return offer ? `${offerUrl(offer, siteUrl)}?abgebrochen=1` : null;
}

/* ---------------- Per-offer lock ---------------- */

const locks = new Map<string, Promise<unknown>>();
/** Serialises payment starts per offer (double clicks, two tabs) within this process. */
export function withOfferLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(id) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  const tail = run.catch(() => undefined);
  locks.set(id, tail);
  void tail.then(() => { if (locks.get(id) === tail) locks.delete(id); });
  return run;
}
