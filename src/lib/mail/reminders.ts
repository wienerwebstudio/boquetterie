import "server-only";
import { randomBytes } from "node:crypto";
import type { Occasion } from "@/types";
import type { Reminder, ReminderLeadDays } from "@/types/reminders";
import { readData, writeData } from "@/lib/cms";
import { getLocalNow } from "@/lib/delivery";

/**
 * Occasion reminders ("Nie wieder einen Anlass vergessen").
 *
 * Storage: `data/reminders.json` (via cms.readData/writeData). A reminder holds a
 * day + month (no year) and is sent `leadDays` before that date – every year when
 * `yearly` is set, otherwise once. Only double-opt-in confirmed reminders are sent.
 */

export const DATA_FILE = "reminders";
export const CUSTOM_OCCASION = "eigener";
export const LEAD_DAYS: ReminderLeadDays[] = [3, 7, 14];
/** Unconfirmed reminders are dropped after this many days. */
const UNCONFIRMED_TTL_DAYS = 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MONTH_NAMES = ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export const getReminders = () => readData<Reminder[]>(DATA_FILE, []);
export const saveReminders = (list: Reminder[]) => writeData(DATA_FILE, list);

export function newToken() {
  return randomBytes(16).toString("hex");
}
export function newReminderId() {
  return `RM-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

/** Constant-time comparison for tokens from the URL. */
export function tokenMatches(expected: string, given: string) {
  if (!given || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

/* ---------------- Validation ---------------- */

export interface ReminderInput {
  email: string;
  occasionSlug: string;
  occasionLabel: string;
  personName?: string;
  day: number;
  month: number;
  yearly: boolean;
  leadDays: ReminderLeadDays;
}

export type ReminderParse = { ok: true; input: ReminderInput } | { ok: false; errors: Record<string, string> };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const int = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isInteger(n) ? n : NaN;
};

export function daysInMonth(month: number) {
  // Allow Feb 29 – it is clamped to Feb 28 in non-leap years when sending.
  return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
}

export function parseReminderInput(body: Record<string, unknown>, occasions: Pick<Occasion, "slug" | "name">[]): ReminderParse {
  const errors: Record<string, string> = {};
  const email = str(body.email, 254).toLowerCase();
  const occasionSlug = str(body.occasion, 60);
  const custom = str(body.customOccasion, 60);
  const personName = str(body.personName, 60);
  const day = int(body.day);
  const month = int(body.month);
  const yearly = body.yearly === true || body.yearly === "true" || body.yearly === "on";
  const leadDays = int(body.leadDays);
  const consent = body.consent === true || body.consent === "true" || body.consent === "on";

  if (!EMAIL_RE.test(email)) errors.email = "Bitte gib eine gültige E-Mail-Adresse an.";
  let occasionLabel = "";
  if (occasionSlug === CUSTOM_OCCASION) {
    if (custom.length < 2) errors.customOccasion = "Bitte gib an, woran wir dich erinnern sollen.";
    occasionLabel = custom;
  } else {
    const occ = occasions.find((o) => o.slug === occasionSlug);
    if (!occ) errors.occasion = "Bitte wähle einen Anlass.";
    else occasionLabel = occ.name;
  }
  if (!(month >= 1 && month <= 12)) errors.month = "Bitte wähle einen Monat.";
  if (!(day >= 1 && day <= (daysInMonth(month) || 31))) errors.day = "Bitte prüfe den Tag.";
  if (!LEAD_DAYS.includes(leadDays as ReminderLeadDays)) errors.leadDays = "Bitte wähle, wann wir dich erinnern sollen.";
  if (!consent) errors.consent = "Bitte bestätige, dass wir dir Erinnerungen schicken dürfen.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    input: { email, occasionSlug, occasionLabel, personName: personName || undefined, day, month, yearly, leadDays: leadDays as ReminderLeadDays },
  };
}

/* ---------------- Dates ---------------- */

/** "12. März" – no year. */
export function formatReminderDate(r: Pick<Reminder, "day" | "month">) {
  return `${r.day}. ${MONTH_NAMES[r.month - 1] ?? ""}`;
}

/** Today's date in the shop time zone as YYYY-MM-DD. */
export function todayIso(timezone = "Europe/Vienna") {
  return getLocalNow(timezone).date;
}

function utcDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function isLeap(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** The occasion's date in the given year; Feb 29 falls back to Feb 28. */
export function occasionDateInYear(r: Pick<Reminder, "day" | "month">, year: number) {
  const day = r.month === 2 && r.day === 29 && !isLeap(year) ? 28 : r.day;
  return Date.UTC(year, r.month - 1, day);
}

const DAY_MS = 86_400_000;

/**
 * Decides whether a reminder is due today. It is due when today lies inside the
 * window [occasion − leadDays, occasion) for this or next year and nothing has
 * been sent for that occasion year yet. Using a window instead of one exact day
 * makes a missed cron run (or a reminder created inside the window) harmless.
 */
export function dueForYear(r: Reminder, today: string): { year: number; daysUntil: number } | null {
  if (!r.confirmed) return null;
  const t = utcDay(today);
  const thisYear = Number(today.slice(0, 4));
  for (const year of [thisYear, thisYear + 1]) {
    if (r.lastSentYear === year) continue;
    const occasion = occasionDateInYear(r, year);
    const daysUntil = Math.round((occasion - t) / DAY_MS);
    if (daysUntil >= 1 && daysUntil <= r.leadDays) return { year, daysUntil };
  }
  return null;
}

/** Drops unconfirmed reminders that are older than the TTL. */
export function pruneUnconfirmed(list: Reminder[], now = Date.now()) {
  return list.filter((r) => r.confirmed || now - new Date(r.createdAt).getTime() < UNCONFIRMED_TTL_DAYS * DAY_MS);
}
