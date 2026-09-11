/**
 * Runtime data types for occasion reminders, review requests and review submissions.
 * All of these live in `data/*.json` (git-ignored) and are accessed via
 * `readData`/`writeData` from `src/lib/cms.ts`.
 */

export type ReminderLeadDays = 3 | 7 | 14;

export interface Reminder {
  id: string;
  createdAt: string; // ISO datetime
  email: string;
  /** Occasion slug from content/occasions.json or "eigener" for a custom one. */
  occasionSlug: string;
  /** Display label – the occasion name, or the custom text entered by the user. */
  occasionLabel: string;
  /** Name of the person the reminder is about (optional). */
  personName?: string;
  day: number; // 1–31
  month: number; // 1–12
  yearly: boolean;
  leadDays: ReminderLeadDays;
  /** Double opt-in: only confirmed reminders are ever sent. */
  confirmed: boolean;
  confirmedAt?: string;
  /** Used for both the confirmation and the unsubscribe link. */
  unsubscribeToken: string;
  /** Year of the occasion the last reminder was sent for (avoids duplicates). */
  lastSentYear?: number;
}

/** One entry per order that already received a review request. */
export interface ReviewRequestRecord {
  orderId: string;
  /** When the review request mail was sent (empty when the customer reviewed without one). */
  sentAt?: string; // ISO datetime
  /** Set once a review for this order was submitted – blocks a second submission. */
  submittedAt?: string;
}

export interface ReviewSubmission {
  id: string;
  createdAt: string; // ISO datetime
  orderId: string;
  productSlug?: string;
  name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  status: "pending";
}
