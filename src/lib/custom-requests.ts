import "server-only";
import { randomInt } from "node:crypto";
import type { ContactMessage, CustomRequest, CustomRequestStatus } from "@/types";
import { getContactMessages, getCustomRequests, saveCustomRequests } from "@/lib/cms";
import { STATUS_LABELS } from "@/lib/custom-requests-core";

/**
 * Customer requests ("Anfrage", /anfrage) – storage and the admin inbox (server only).
 * Rules and validation: src/lib/custom-requests-core.ts. See docs/INQUIRIES.md.
 */

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newCustomRequestId(existing: ReadonlySet<string>) {
  for (let attempt = 0; attempt < 20; attempt++) {
    let s = "";
    for (let i = 0; i < 6; i++) s += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
    const id = `AF-${s}`;
    if (!existing.has(id)) return id;
  }
  throw new Error("Could not generate a unique request id");
}

/** Appends a request (newest first). Throws when the datastore cannot write. */
export async function addCustomRequest(request: CustomRequest) {
  const list = await getCustomRequests();
  list.unshift(request);
  await saveCustomRequests(list);
}

/** One row of the admin inbox: a request from /anfrage or a contact form message. */
export interface InboxRow {
  type: "request" | "contact";
  id: string;
  createdAt: string;
  name: string;
  email: string;
  status: CustomRequestStatus;
  /** Topics (requests) or the contact subject. */
  tags: string[];
  date?: string;
  preview: string;
  hasPhoto: boolean;
  offerId?: string;
}

/** Contact messages have no status of their own until the team sets one: unread = new, read = answered. */
export function contactStatus(m: ContactMessage): CustomRequestStatus {
  return m.status ?? (m.read ? "answered" : "new");
}

export async function getInbox(): Promise<InboxRow[]> {
  const [requests, contacts] = await Promise.all([getCustomRequests(), getContactMessages()]);
  const rows: InboxRow[] = [
    ...requests.map((r): InboxRow => ({
      type: "request", id: r.id, createdAt: r.createdAt, name: r.name, email: r.email, status: r.status,
      tags: r.topics, date: r.date, preview: r.message, hasPhoto: Boolean(r.photo), offerId: r.offerId,
    })),
    ...contacts.map((m): InboxRow => ({
      type: "contact", id: m.id, createdAt: m.createdAt, name: m.name, email: m.email, status: contactStatus(m),
      tags: [m.subject], preview: m.message, hasPhoto: false,
    })),
  ];
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Count for the admin nav badge and dashboard. */
export async function countNewInbox(): Promise<number> {
  try {
    return (await getInbox()).filter((r) => r.status === "new").length;
  } catch {
    return 0;
  }
}

export const statusNote = (s: CustomRequestStatus) => `Status: ${STATUS_LABELS[s]}`;
