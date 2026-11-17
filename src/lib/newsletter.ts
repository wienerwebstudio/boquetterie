import "server-only";
import { randomBytes } from "node:crypto";
import { getNewsletterSubscribers, getSettings, saveNewsletterSubscribers } from "@/lib/cms";
import { mailBrand, sendMail } from "@/lib/mail";
import { newsletterConfirmation } from "@/lib/mail/templates";
import { tokenMatches } from "@/lib/mail/reminders";
import type { NewsletterSubscriber } from "@/types";

/**
 * Newsletter with double opt-in.
 *
 * Sign-up stores the address as `pending` and mails a link to a confirmation page.
 * Only a click on the button there (a POST – mail scanners only follow links)
 * confirms it. Newsletters may go only to `confirmed` addresses. The same token
 * signs the unsubscribe link, which also leads to a page with a button.
 */

/** A confirmation mail is not sent again for the same address within this time. */
const RESEND_AFTER_MS = 10 * 60 * 1000;

export const isConfirmed = (s: NewsletterSubscriber) => s.status === "confirmed";

const newId = () => `NL-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
const newToken = () => randomBytes(18).toString("hex");

export function newsletterLinks(siteUrl: string, s: { id: string; token: string }) {
  const q = `id=${encodeURIComponent(s.id)}&token=${encodeURIComponent(s.token)}`;
  return { confirm: `${siteUrl}/newsletter/bestaetigen?${q}`, unsubscribe: `${siteUrl}/newsletter/abmelden?${q}` };
}

export type SignupResult = { ok: true; mailed: boolean } | { ok: false; reason: "store" | "mail" };

/**
 * Starts (or repeats) the double opt-in for `email`. Already confirmed addresses get no
 * mail and the same answer as everybody else, so the form reveals nothing about who
 * is subscribed. Storage or mail failures are reported – without the mail the visitor
 * cannot confirm, so the sign-up must not look successful.
 */
export async function requestNewsletterSignup(email: string, source: "website" | "checkout", now = new Date()): Promise<SignupResult> {
  const address = email.trim().toLowerCase();
  let list: NewsletterSubscriber[];
  try {
    list = await getNewsletterSubscribers();
  } catch (err) {
    console.error("[newsletter] could not read subscribers", err);
    return { ok: false, reason: "store" };
  }
  const existing = list.find((s) => s.email.toLowerCase() === address);
  if (existing && isConfirmed(existing)) return { ok: true, mailed: false };
  if (existing?.requestedAt && existing.token && existing.id && now.getTime() - Date.parse(existing.requestedAt) < RESEND_AFTER_MS) {
    return { ok: true, mailed: false };
  }

  const entry: NewsletterSubscriber = {
    ...(existing ?? { email: address, createdAt: now.toISOString() }),
    id: existing?.id ?? newId(),
    token: existing?.token ?? newToken(),
    status: "pending",
    requestedAt: now.toISOString(),
    source: existing?.source ?? source,
  };
  const next = existing ? list.map((s) => (s === existing ? entry : s)) : [...list, entry];
  try {
    await saveNewsletterSubscribers(next);
  } catch (err) {
    console.error("[newsletter] could not store subscriber", err);
    return { ok: false, reason: "store" };
  }

  const brand = mailBrand(await getSettings());
  const m = newsletterConfirmation({ brand, ...newsletterLinks(brand.siteUrl, { id: entry.id!, token: entry.token! }) });
  const res = await sendMail({ to: address, subject: m.subject, html: m.html, text: m.text, tags: { type: "newsletter_confirm" } }).catch(() => null);
  // Outside production the console provider only logs the mail (the link is in the log) – that counts.
  const logged = res?.provider === "console" && process.env.NODE_ENV !== "production";
  if (!res?.sent && !logged) return { ok: false, reason: "mail" };
  return { ok: true, mailed: true };
}

/**
 * Tick box in the checkout (owners' decision): the customer is subscribed right away,
 * without a confirmation mail. Consent is documented with time, source and order number.
 */
export async function subscribeFromCheckout(email: string, orderId: string, now = new Date()): Promise<{ ok: boolean }> {
  const address = email.trim().toLowerCase();
  const list = await getNewsletterSubscribers();
  const existing = list.find((s) => s.email.toLowerCase() === address);
  if (existing && isConfirmed(existing)) return { ok: true };
  const entry: NewsletterSubscriber = {
    ...(existing ?? { email: address, createdAt: now.toISOString() }),
    id: existing?.id ?? newId(),
    token: existing?.token ?? newToken(),
    status: "confirmed",
    confirmedAt: now.toISOString(),
    source: "checkout",
    orderId,
  };
  await saveNewsletterSubscribers(existing ? list.map((s) => (s === existing ? entry : s)) : [...list, entry]);
  return { ok: true };
}

export type ConfirmResult = "confirmed" | "already" | "invalid";

export async function confirmNewsletter(id: string, token: string, now = new Date()): Promise<ConfirmResult> {
  const list = await getNewsletterSubscribers();
  const entry = list.find((s) => s.id === id);
  if (!entry?.token || !tokenMatches(entry.token, token)) return "invalid";
  if (isConfirmed(entry)) return "already";
  await saveNewsletterSubscribers(list.map((s) => (s === entry ? { ...s, status: "confirmed" as const, confirmedAt: now.toISOString() } : s)));
  return "confirmed";
}

/** Removes the address entirely. Unknown or already removed → "invalid" (nothing to do). */
export async function unsubscribeNewsletter(id: string, token: string): Promise<"removed" | "invalid"> {
  const list = await getNewsletterSubscribers();
  const entry = list.find((s) => s.id === id);
  if (!entry?.token || !tokenMatches(entry.token, token)) return "invalid";
  await saveNewsletterSubscribers(list.filter((s) => s !== entry));
  return "removed";
}
