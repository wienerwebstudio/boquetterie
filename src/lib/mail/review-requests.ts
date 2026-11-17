import "server-only";
import { randomBytes } from "node:crypto";
import type { Order, Review } from "@/types";
import type { ReviewConsent, ReviewRequestRecord, ReviewSubmission } from "@/types/reminders";
import { getOrders, readData, writeData } from "@/lib/cms";
import { sendReviewRequest, type MailResult } from "@/lib/mail";

/**
 * Review requests & submissions.
 *
 * - `data/review-requests.json`   – one record per order that got a request mail
 *                                   (and/or submitted a review).
 * - `data/review-submissions.json` – reviews written by customers, status "pending"
 *                                   until an admin accepts them into content/reviews.json.
 */

export const REQUESTS_FILE = "review-requests";
export const SUBMISSIONS_FILE = "review-submissions";

/** Send the request at the earliest this many days after delivery … */
export const MIN_DAYS_AFTER_DELIVERY = 1;
/** … and never after this many days. */
export const MAX_DAYS_AFTER_DELIVERY = 30;

const DAY_MS = 86_400_000;

export const getReviewRequests = () => readData<ReviewRequestRecord[]>(REQUESTS_FILE, []);
export const saveReviewRequests = (list: ReviewRequestRecord[]) => writeData(REQUESTS_FILE, list);
export const getReviewSubmissions = () => readData<ReviewSubmission[]>(SUBMISSIONS_FILE, []);
export const saveReviewSubmissions = (list: ReviewSubmission[]) => writeData(SUBMISSIONS_FILE, list);

export function newSubmissionId() {
  return `RS-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

/**
 * ISO datetime the order was (last) set to "delivered", or null. Later history
 * entries that keep the status (notes such as "Mail erneut gesendet") belong to
 * the same delivery and do not move the date.
 */
export function deliveredAt(order: Order): string | null {
  let at: string | null = null;
  let previous: string | null = null;
  for (const h of order.history) {
    if (h.status === "delivered" && previous !== "delivered") at = h.at;
    previous = h.status;
  }
  return at;
}

/**
 * Pure due-date rule: delivered, has an e-mail address, no request yet (and not
 * reviewed yet), and between MIN and MAX days after the delivery.
 */
export function isDueForReviewRequest(order: Order, done: ReadonlySet<string>, now = Date.now()) {
  if (order.status !== "delivered" || done.has(order.id)) return false;
  if (!order.customer.email) return false;
  const at = deliveredAt(order);
  if (!at) return false;
  const days = (now - new Date(at).getTime()) / DAY_MS;
  return days >= MIN_DAYS_AFTER_DELIVERY && days <= MAX_DAYS_AFTER_DELIVERY;
}

/** Orders that should receive a review request now. */
export async function findOrdersDueForReviewRequest(now = Date.now()) {
  const [orders, records] = await Promise.all([getOrders(), getReviewRequests()]);
  const done = new Set(records.map((r) => r.orderId));
  return orders.filter((o) => isDueForReviewRequest(o, done, now));
}

/** Returns a copy of `records` with the send noted for `orderId` (one record per order). */
export function withRequestSent(records: ReviewRequestRecord[], orderId: string, sentBy: "cron" | "admin", at: string): ReviewRequestRecord[] {
  const idx = records.findIndex((r) => r.orderId === orderId);
  if (idx === -1) return [...records, { orderId, sentAt: at, sentBy, sendCount: 1 }];
  const prev = records[idx];
  const next = [...records];
  next[idx] = { ...prev, sentAt: at, sentBy, sendCount: (prev.sendCount ?? (prev.sentAt ? 1 : 0)) + 1 };
  return next;
}

/** True when the mail counts as delivered: a real provider accepted it, or the console provider logged it. */
export function mailWentOut(result: MailResult) {
  return result.sent || result.provider === "console";
}

/** A second manual send within this window is treated as a double click and refused. */
export const MANUAL_RESEND_GUARD_MS = 10 * 60 * 1000;

export type ManualReviewRequestResult =
  | { ok: true; sentAt: string; result: MailResult; notDelivered: boolean }
  | { ok: false; reason: "no-email" | "cancelled" | "reviewed" | "recently-sent" | "mail-failed"; message: string; result?: MailResult };

/**
 * Sends the review request for one order by hand (admin button or the checkbox on
 * the status change) and records `sentAt`, so the daily cron never sends it again.
 * Calling it twice in a row does not send twice (MANUAL_RESEND_GUARD_MS).
 */
export async function sendManualReviewRequest(order: Order, now = Date.now()): Promise<ManualReviewRequestResult> {
  if (!order.customer.email) return { ok: false, reason: "no-email", message: "Für diese Bestellung ist keine E-Mail-Adresse hinterlegt." };
  if (order.status === "cancelled") return { ok: false, reason: "cancelled", message: "Die Bestellung ist storniert – keine Bewertungsanfrage." };
  if (await hasSubmittedReview(order.id)) return { ok: false, reason: "reviewed", message: "Die Kund:in hat bereits bewertet – keine weitere Anfrage nötig." };

  const records = await getReviewRequests();
  const last = records.find((r) => r.orderId === order.id)?.sentAt;
  if (last && now - new Date(last).getTime() < MANUAL_RESEND_GUARD_MS) {
    return { ok: false, reason: "recently-sent", message: "Die Bewertungsanfrage wurde gerade eben schon gesendet." };
  }

  const result = await sendReviewRequest(order);
  if (!mailWentOut(result)) {
    return { ok: false, reason: "mail-failed", message: `Die Mail konnte nicht gesendet werden${result.error ? `: ${result.error}` : "."}`, result };
  }
  const sentAt = new Date(now).toISOString();
  // Re-read right before writing: the customer may have submitted meanwhile.
  await saveReviewRequests(withRequestSent(await getReviewRequests(), order.id, "admin", sentAt));
  return { ok: true, sentAt, result, notDelivered: order.status !== "delivered" };
}

/** Status of the review request for the admin order page. */
export async function getReviewRequestStatus(orderId: string) {
  const [records, submissions] = await Promise.all([getReviewRequests(), getReviewSubmissions()]);
  const record = records.find((r) => r.orderId === orderId) ?? null;
  const pending = submissions.find((s) => s.orderId === orderId) ?? null;
  return {
    sentAt: record?.sentAt ?? null,
    sentBy: record?.sentBy ?? null,
    sendCount: record?.sendCount ?? (record?.sentAt ? 1 : 0),
    submittedAt: record?.submittedAt ?? pending?.createdAt ?? null,
    /** A submission still waits for approval in /admin/bewertungen/eingereicht. */
    pendingSubmissionId: pending?.id ?? null,
  };
}

export async function hasSubmittedReview(orderId: string) {
  const [records, submissions] = await Promise.all([getReviewRequests(), getReviewSubmissions()]);
  return submissions.some((s) => s.orderId === orderId) || records.some((r) => r.orderId === orderId && Boolean(r.submittedAt));
}

/** Marks the order as reviewed in the request log (creates the record when the customer came without a request mail). */
export async function markReviewSubmitted(orderId: string, at = new Date().toISOString(), consent?: ReviewConsent) {
  const records = await getReviewRequests();
  const idx = records.findIndex((r) => r.orderId === orderId);
  const patch = { submittedAt: at, ...(consent ? { consent } : {}) };
  if (idx === -1) records.push({ orderId, ...patch });
  else records[idx] = { ...records[idx], ...patch };
  await saveReviewRequests(records);
}

/** Alt text of a customer photo, e.g. "Kundenfoto zu Red Passion". */
export function reviewPhotoAlt(productName?: string | null) {
  return productName ? `Kundenfoto zu ${productName}` : "Kundenfoto";
}

/**
 * Converts an accepted submission into a public review entry. `photoKeys` are the
 * photos the admin approved (all others are left out); `productName` feeds the alt text.
 */
export function submissionToReview(s: ReviewSubmission, id: string, opts: { photoKeys?: readonly string[]; productName?: string | null } = {}): Review {
  const keep = new Set(opts.photoKeys ?? []);
  const photos = (s.photos ?? []).filter((p) => keep.has(p.key)).map((p) => ({ src: p.url, alt: reviewPhotoAlt(opts.productName) }));
  return {
    id,
    name: s.name,
    rating: s.rating,
    text: s.text,
    ...(s.productSlug ? { productSlug: s.productSlug } : {}),
    verified: true,
    date: s.createdAt.slice(0, 10),
    demo: false,
    ...(photos.length ? { photos } : {}),
  };
}
