import "server-only";
import { randomBytes } from "node:crypto";
import type { Order, Review } from "@/types";
import type { ReviewRequestRecord, ReviewSubmission } from "@/types/reminders";
import { getOrders, readData, writeData } from "@/lib/cms";

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
export const MIN_DAYS_AFTER_DELIVERY = 2;
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

/** ISO datetime of the (latest) "delivered" history entry, or null. */
export function deliveredAt(order: Order): string | null {
  const entry = [...order.history].reverse().find((h) => h.status === "delivered");
  return entry?.at ?? null;
}

/** Orders that should receive a review request now. */
export async function findOrdersDueForReviewRequest(now = Date.now()) {
  const [orders, records] = await Promise.all([getOrders(), getReviewRequests()]);
  const done = new Set(records.map((r) => r.orderId));
  return orders.filter((o) => {
    if (o.status !== "delivered" || done.has(o.id)) return false;
    if (!o.customer.email) return false;
    const at = deliveredAt(o);
    if (!at) return false;
    const days = (now - new Date(at).getTime()) / DAY_MS;
    return days >= MIN_DAYS_AFTER_DELIVERY && days <= MAX_DAYS_AFTER_DELIVERY;
  });
}

export async function hasSubmittedReview(orderId: string) {
  const [records, submissions] = await Promise.all([getReviewRequests(), getReviewSubmissions()]);
  return submissions.some((s) => s.orderId === orderId) || records.some((r) => r.orderId === orderId && Boolean(r.submittedAt));
}

/** Marks the order as reviewed in the request log (creates the record when the customer came without a request mail). */
export async function markReviewSubmitted(orderId: string, at = new Date().toISOString()) {
  const records = await getReviewRequests();
  const idx = records.findIndex((r) => r.orderId === orderId);
  if (idx === -1) records.push({ orderId, submittedAt: at });
  else records[idx] = { ...records[idx], submittedAt: at };
  await saveReviewRequests(records);
}

/** Converts an accepted submission into a public review entry. */
export function submissionToReview(s: ReviewSubmission, id: string): Review {
  return {
    id,
    name: s.name,
    rating: s.rating,
    text: s.text,
    ...(s.productSlug ? { productSlug: s.productSlug } : {}),
    verified: true,
    date: s.createdAt.slice(0, 10),
    demo: false,
  };
}
