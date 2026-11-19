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
  /** Language the reminder was created in (`Locale`) – its mails use it. Missing = German. */
  locale?: string;
}

/** One entry per order that already received a review request. */
export interface ReviewRequestRecord {
  orderId: string;
  /** When the (latest) review request mail was sent (empty when the customer reviewed without one). */
  sentAt?: string; // ISO datetime
  /** Who sent the latest request: the daily cron or an admin by hand. */
  sentBy?: "cron" | "admin";
  /** How many request mails went out for this order (manual resends count). */
  sendCount?: number;
  /** Set once a review for this order was submitted – blocks a second submission. */
  submittedAt?: string;
  /**
   * Consent to publishing the review (first name) and the uploaded photos, as given
   * in the review form. Kept here because the submission itself is removed once the
   * admin accepts or discards it.
   */
  consent?: ReviewConsent;
}

export interface ReviewConsent {
  /** ISO datetime the customer ticked the box (= time of the submission). */
  at: string;
  /** The exact wording the customer agreed to. */
  text: string;
}

/** A customer photo attached to a pending submission (already re-encoded, EXIF-free). */
export interface ReviewSubmissionPhoto {
  /** Storage key, e.g. `reviews/2026/11/bq-7k2m9q-1a2b3c4d.jpg` – needed to delete it again. */
  key: string;
  /** URL the photo is served at (`/media/…` or the S3/CDN URL). */
  url: string;
  width: number;
  height: number;
}

export interface ReviewSubmission {
  id: string;
  createdAt: string; // ISO datetime
  orderId: string;
  productSlug?: string;
  name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  /** Up to three photos; only shown on the site if an admin accepts them. */
  photos?: ReviewSubmissionPhoto[];
  consent?: ReviewConsent;
  /** Shop language of the order (`Locale`), i.e. the language the review is most likely written in. Missing = German. */
  lang?: string;
  status: "pending";
}
