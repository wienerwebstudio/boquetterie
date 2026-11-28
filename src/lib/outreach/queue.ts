import type { OutreachContact, OutreachSend } from "@/types/outreach";
import { normalizeEmail } from "./format";

/**
 * Pure queue decisions for outreach sends: daily limit, which queued mails are due,
 * whether a follow-up still goes out, recently mailed contacts, click targets and
 * Vienna local time ↔ UTC. The I/O lives in src/lib/outreach/service.ts.
 */

export const DEFAULT_DAILY_LIMIT = 50;
export const RECENT_DAYS = 30;
export const DEFAULT_FOLLOW_UP_DAYS = 7;
/** A send stuck in "sending" this long is marked failed (never re-sent – it may have gone out). */
export const STALE_SENDING_MINUTES = 15;

export function dailyLimit(env: Record<string, string | undefined> = process.env): number {
  const raw = env.OUTREACH_DAILY_LIMIT?.trim();
  if (!raw) return DEFAULT_DAILY_LIMIT;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_DAILY_LIMIT;
}

/** Calendar date (YYYY-MM-DD) of an instant in `tz`. */
export function localDate(at: Date, tz = "Europe/Vienna"): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}

function offsetMinutes(at: Date, tz: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** "2026-12-01" + "09:30" in Europe/Vienna → UTC instant. Null for malformed input. */
export function localToUtc(date: string, time: string, tz = "Europe/Vienna"): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const naive = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]));
  if (!Number.isFinite(naive) || Number(t[1]) > 23 || Number(t[2]) > 59) return null;
  // Rejects 2026-13-01, 2026-02-30 … (Date.UTC would roll them over).
  if (new Date(naive).toISOString().slice(0, 10) !== date) return null;
  let guess = naive - offsetMinutes(new Date(naive), tz) * 60000;
  guess = naive - offsetMinutes(new Date(guess), tz) * 60000;
  return new Date(guess);
}

/** Sends that went out today (local date in `tz`) – they count against the daily limit. */
export function sentToday(sends: OutreachSend[], now: Date, tz = "Europe/Vienna"): number {
  const today = localDate(now, tz);
  return sends.filter((s) => (s.status === "sent" || s.status === "sending") && localDate(new Date(s.sentAt ?? s.claimedAt ?? s.createdAt), tz) === today).length;
}

export function remainingToday(sends: OutreachSend[], now: Date, limit: number, tz = "Europe/Vienna"): number {
  return Math.max(0, limit - sentToday(sends, now, tz));
}

/** Queued sends whose time has come, oldest first, at most `max`. */
export function dueSends(sends: OutreachSend[], now: Date, max: number): OutreachSend[] {
  if (max <= 0) return [];
  return sends
    .filter((s) => s.status === "queued" && new Date(s.scheduledFor).getTime() <= now.getTime())
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor) || a.createdAt.localeCompare(b.createdAt))
    .slice(0, max);
}

export type SendDecision = { send: true } | { send: false; reason: string; cancel?: boolean };

/**
 * Last check right before a queued mail goes out. Unsubscribed addresses are never
 * mailed; a follow-up only goes to contacts still "Angeschrieben".
 */
export function sendDecision(send: OutreachSend, contact: OutreachContact | undefined, unsubscribed: Set<string>): SendDecision {
  if (!contact) return { send: false, reason: "Kontakt gelöscht", cancel: true };
  if (unsubscribed.has(normalizeEmail(contact.email)) || unsubscribed.has(normalizeEmail(send.email))) {
    return { send: false, reason: "Adresse hat sich abgemeldet" };
  }
  if (send.kind === "followup" && contact.status !== "angeschrieben") {
    return { send: false, reason: `Nachfassen entfällt – Status ist nicht mehr „Angeschrieben“` };
  }
  return { send: true };
}

/** The follow-up to queue once `send` went out (null when none was requested). */
export function followUpOf(send: OutreachSend, sentAt: Date, make: { id: string; token: string; templateName: string }): OutreachSend | null {
  if (!send.followUp || send.kind !== "initial") return null;
  const days = Math.min(90, Math.max(1, Math.round(send.followUp.days)));
  return {
    id: make.id,
    token: make.token,
    batchId: send.batchId,
    kind: "followup",
    contactId: send.contactId,
    email: send.email,
    templateId: send.followUp.templateId,
    templateName: make.templateName,
    status: "queued",
    createdAt: sentAt.toISOString(),
    scheduledFor: new Date(sentAt.getTime() + days * 86_400_000).toISOString(),
    parentId: send.id,
    links: [],
    opens: 0,
    clicks: [],
  };
}

/** Contacts that got a real outreach mail within the last `days` days. */
export function recentlyMailed(contacts: Pick<OutreachContact, "id" | "lastMailedAt">[], now: Date, days = RECENT_DAYS): Set<string> {
  const since = now.getTime() - days * 86_400_000;
  return new Set(contacts.filter((c) => c.lastMailedAt && new Date(c.lastMailedAt).getTime() >= since).map((c) => c.id));
}

/** Sends stuck in "sending" (function aborted mid-run). */
export function staleSending(sends: OutreachSend[], now: Date, minutes = STALE_SENDING_MINUTES): OutreachSend[] {
  const limit = now.getTime() - minutes * 60_000;
  return sends.filter((s) => s.status === "sending" && new Date(s.claimedAt ?? s.createdAt).getTime() < limit);
}

/**
 * Click redirect target: only a URL stored in this very send (by index), and only
 * http(s). Anything else → null (the route then sends the visitor to the shop).
 */
export function clickTarget(send: Pick<OutreachSend, "links"> | undefined, index: string | null): string | null {
  if (!send || index === null || !/^\d{1,3}$/.test(index)) return null;
  const url = send.links[Number(index)];
  if (!url || !/^https?:\/\/[^\s<>"']+$/i.test(url)) return null;
  return url;
}

export function isValidTrackingToken(token: string) {
  return /^[A-Za-z0-9_-]{16,64}$/.test(token);
}
