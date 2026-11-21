/**
 * Outreach: personal one-to-one e-mails to businesses (partner requests to flower
 * shops, B2B offers to funeral homes, hotels, offices, restaurants …).
 *
 * Runtime data documents (kind "data", read/written through src/lib/cms.ts):
 *   outreach-contacts      OutreachContact[]
 *   outreach-templates     OutreachTemplate[]   (starter templates seeded on first read)
 *   outreach-sends         OutreachSend[]       (queue + log, incl. open/click tracking)
 *   outreach-unsubscribed  OutreachUnsubscribe[]
 * See docs/OUTREACH.md.
 */

export const OUTREACH_CATEGORIES = ["florist", "bestattung", "hotel", "buero", "restaurant", "sonstiges"] as const;
export type OutreachCategory = (typeof OUTREACH_CATEGORIES)[number];

export const OUTREACH_STATUSES = ["neu", "angeschrieben", "geantwortet", "termin", "partner", "kein-interesse"] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export type OutreachSalutation = "frau" | "herr" | "";
export type OutreachLanguage = "de" | "en";

export interface OutreachNote {
  id: string;
  at: string; // ISO
  text: string;
}

export type OutreachEventType =
  | "created" | "imported" | "updated" | "status" | "note"
  | "queued" | "sent" | "failed" | "skipped" | "cancelled"
  | "open" | "click" | "unsubscribed";

export interface OutreachEvent {
  at: string; // ISO
  type: OutreachEventType;
  text: string;
  sendId?: string;
}

export interface OutreachContact {
  id: string;
  company: string;
  salutation: OutreachSalutation;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** Free text as entered: "1070", "7. Bezirk", "Neubau" … */
  district: string;
  category: OutreachCategory;
  website: string;
  /** General note (imported "Notiz" column, editable). Timestamped entries live in `noteEntries`. */
  notes: string;
  status: OutreachStatus;
  tags: string[];
  /** Language of the mails for this contact (default German). */
  language?: OutreachLanguage;
  noteEntries: OutreachNote[];
  history: OutreachEvent[];
  createdAt: string;
  updatedAt: string;
  /** Last real (non-test) outreach mail, ISO. */
  lastMailedAt?: string;
}

export interface OutreachFile {
  /** Storage key below `outreach/` (src/lib/uploads.ts). */
  key: string;
  /** Public URL (relative `/media/…` or absolute S3 URL). */
  url: string;
  name: string;
  bytes: number;
  contentType: string;
}

export interface OutreachVideo {
  /** Where the play button leads: an uploaded video (`/media/…`) or a pasted URL (YouTube, Vimeo …). */
  url: string;
  /** Poster image as uploaded. */
  posterUrl?: string;
  /** Poster with the play button burnt in (generated on upload) – what the mail shows. */
  posterPlayUrl?: string;
  /** Uploaded video file, when not a pasted URL. */
  file?: OutreachFile;
  label?: string;
}

export type OutreachTemplateCategory = OutreachCategory | "allgemein" | "nachfassen";

export interface OutreachTemplate {
  id: string;
  name: string;
  category: OutreachTemplateCategory;
  language: OutreachLanguage;
  subject: string;
  /** Optional large serif headline above the text. */
  headline?: string;
  /** Plain text with a tiny syntax: blank line = paragraph, **bold**, [Link](url), "- " lists. */
  body: string;
  headerImage?: OutreachFile;
  attachments: OutreachFile[];
  video?: OutreachVideo;
  createdAt: string;
  updatedAt: string;
  /** Seeded starter template (informational). */
  starter?: boolean;
}

export type OutreachSendStatus = "queued" | "sending" | "sent" | "failed" | "skipped" | "cancelled";

export interface OutreachSend {
  id: string;
  /** Random per-send token for the tracking pixel and click redirects. */
  token: string;
  batchId: string;
  kind: "initial" | "followup";
  contactId: string;
  email: string;
  templateId: string;
  templateName: string;
  status: OutreachSendStatus;
  createdAt: string;
  /** Not before this moment (ISO, UTC). */
  scheduledFor: string;
  claimedAt?: string;
  sentAt?: string;
  subject?: string;
  provider?: string;
  error?: string;
  /** Why it was skipped/cancelled. */
  reason?: string;
  /** Follow-up to queue after this mail was sent. */
  followUp?: { days: number; templateId: string };
  /** For follow-ups: the initial send. */
  parentId?: string;
  /** The only URLs the click route may redirect to (index = `?i=`). */
  links: string[];
  opens: number;
  firstOpenAt?: string;
  lastOpenAt?: string;
  clicks: { at: string; url: string }[];
}

export interface OutreachUnsubscribe {
  email: string;
  at: string;
  source: "link" | "one-click" | "admin";
}
