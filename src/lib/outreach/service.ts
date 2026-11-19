import "server-only";
import {
  getOutreachContacts, getOutreachSends, getOutreachTemplates, getOutreachUnsubscribed, getSettings,
  saveOutreachContacts, saveOutreachUnsubscribed, updateOutreachContact, updateOutreachSends,
} from "@/lib/cms";
import { sendMail, mailProvider, type MailAttachment, type MailResult } from "@/lib/mail";
import { readOutreachFile } from "@/lib/uploads";
import type { OutreachContact, OutreachEvent, OutreachSend, OutreachTemplate, OutreachUnsubscribe } from "@/types/outreach";
import { contactLabel, normalizeEmail, STATUS_LABELS } from "./format";
import { outreachBrand, renderOutreachMail, SAMPLE_CONTACT, type OutreachBrand } from "./render";
import {
  clickTarget, dailyLimit, dueSends, followUpOf, localDate, recentlyMailed, remainingToday, sendDecision, staleSending,
} from "./queue";
import { newId, outreachSecret, trackingToken, unsubscribeToken } from "./tokens";
import { MAX_ATTACHMENTS_TOTAL } from "./validate";

/**
 * Outreach I/O: queueing, sending (one personalised mail per contact), tracking and
 * unsubscribes. Every write goes through src/lib/cms.ts (read-modify-write).
 */

const TZ = "Europe/Vienna";
/** Per run (admin button / cron every 10 min) – keeps a serverless invocation short. */
const BATCH_SIZE = 25;
const TIME_BUDGET_MS = 20_000;
/** Resend allows ~2 requests per second by default. */
const RESEND_PAUSE_MS = 600;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ev = (type: OutreachEvent["type"], text: string, sendId?: string, at = new Date().toISOString()): OutreachEvent => ({ at, type, text, ...(sendId ? { sendId } : {}) });

export async function brandAndSite(): Promise<{ brand: OutreachBrand; siteUrl: string; replyTo?: string }> {
  const settings = await getSettings();
  const brand = outreachBrand(settings);
  return { brand, siteUrl: brand.siteUrl, replyTo: brand.email };
}

export function unsubscribeLinks(siteUrl: string, email: string, secret: string) {
  const token = unsubscribeToken(email, secret);
  return {
    page: `${siteUrl}/e-mail-abmelden?t=${encodeURIComponent(token)}`,
    oneClick: `${siteUrl}/api/outreach/unsubscribe?t=${encodeURIComponent(token)}`,
  };
}

function listUnsubscribeHeaders(oneClick: string, replyTo?: string): Record<string, string> {
  const mailto = replyTo ? `, <mailto:${replyTo}?subject=${encodeURIComponent("Keine weiteren E-Mails")}>` : "";
  return { "List-Unsubscribe": `<${oneClick}>${mailto}`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
}

/** Reads the template's attachments; throws with a German message when one is missing or too large. */
async function loadAttachments(template: OutreachTemplate): Promise<MailAttachment[]> {
  const out: MailAttachment[] = [];
  let total = 0;
  for (const f of template.attachments ?? []) {
    const content = await readOutreachFile(f.key);
    if (!content) throw new Error(`Anhang „${f.name}“ nicht gefunden`);
    total += content.length;
    if (total > MAX_ATTACHMENTS_TOTAL) throw new Error("Anhänge zusammen größer als 20 MB");
    out.push({ filename: f.name, content, contentType: f.contentType });
  }
  return out;
}

export async function unsubscribedSet(): Promise<Set<string>> {
  return new Set((await getOutreachUnsubscribed()).map((u) => normalizeEmail(u.email)));
}

/* ---------------- queueing ---------------- */

export interface QueueInput {
  templateId: string;
  contactIds: string[];
  /** ISO; omitted = now. */
  scheduledFor?: string;
  followUp?: { days: number; templateId: string } | null;
  allowRecent: boolean;
}

export interface QueueResult {
  ok: boolean;
  message: string;
  queued: number;
  skipped: { id: string; label: string; reason: string }[];
  processed?: ProcessResult;
}

export async function queueOutreach(input: QueueInput): Promise<QueueResult> {
  if (!outreachSecret()) {
    return { ok: false, message: "ADMIN_SECRET oder AUTH_SECRET (mind. 16 Zeichen) fehlt – ohne ihn gibt es keinen Abmeldelink, daher wird nichts gesendet.", queued: 0, skipped: [] };
  }
  const [templates, contacts, sends, blocked] = await Promise.all([getOutreachTemplates(), getOutreachContacts(), getOutreachSends(), unsubscribedSet()]);
  const template = templates.find((t) => t.id === input.templateId);
  if (!template) return { ok: false, message: "Vorlage nicht gefunden.", queued: 0, skipped: [] };
  const followTemplate = input.followUp ? templates.find((t) => t.id === input.followUp!.templateId) : undefined;
  if (input.followUp && !followTemplate) return { ok: false, message: "Vorlage für das Nachfassen nicht gefunden.", queued: 0, skipped: [] };

  const now = new Date();
  const at = input.scheduledFor ? new Date(input.scheduledFor) : now;
  if (Number.isNaN(at.getTime())) return { ok: false, message: "Ungültiger Zeitpunkt.", queued: 0, skipped: [] };
  const recent = recentlyMailed(contacts, now);
  const pending = new Set(sends.filter((s) => s.status === "queued" || s.status === "sending").map((s) => `${s.contactId}:${s.templateId}`));
  const skipped: QueueResult["skipped"] = [];
  const batchId = newId("batch");
  const created: OutreachSend[] = [];

  for (const id of [...new Set(input.contactIds)]) {
    const c = contacts.find((x) => x.id === id);
    if (!c) continue;
    const label = contactLabel(c);
    if (blocked.has(normalizeEmail(c.email))) { skipped.push({ id, label, reason: "hat sich abgemeldet" }); continue; }
    if (!input.allowRecent && recent.has(id)) { skipped.push({ id, label, reason: "in den letzten 30 Tagen angeschrieben" }); continue; }
    if (pending.has(`${id}:${template.id}`)) { skipped.push({ id, label, reason: "steht mit dieser Vorlage schon in der Warteschlange" }); continue; }
    created.push({
      id: newId("snd"),
      token: trackingToken(),
      batchId,
      kind: "initial",
      contactId: id,
      email: normalizeEmail(c.email),
      templateId: template.id,
      templateName: template.name,
      status: "queued",
      createdAt: now.toISOString(),
      scheduledFor: (at.getTime() < now.getTime() ? now : at).toISOString(),
      ...(input.followUp && followTemplate ? { followUp: { days: input.followUp.days, templateId: followTemplate.id } } : {}),
      links: [],
      opens: 0,
      clicks: [],
    });
  }

  if (created.length) {
    await updateOutreachSends((list) => [...list, ...created]);
    const future = at.getTime() > now.getTime() + 60_000;
    const byContact = new Map(created.map((s) => [s.contactId, s]));
    const all = await getOutreachContacts();
    await saveOutreachContacts(all.map((c) => {
      const s = byContact.get(c.id);
      if (!s) return c;
      const when = future ? ` für ${new Intl.DateTimeFormat("de-AT", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).format(at)}` : "";
      const fu = s.followUp ? ` · Nachfassen nach ${s.followUp.days} Tagen mit „${followTemplate?.name}“` : "";
      return { ...c, history: [...c.history, ev("queued", `„${template.name}“ eingeplant${when}${fu}`, s.id)] };
    }));
  }

  let processed: ProcessResult | undefined;
  if (created.length && at.getTime() <= now.getTime() + 60_000) processed = await processOutreachQueue();

  const parts = [`${created.length} Mail${created.length === 1 ? "" : "s"} eingeplant`];
  if (processed) {
    parts.push(`${processed.sent} gesendet`);
    if (processed.failed) parts.push(`${processed.failed} fehlgeschlagen`);
    if (processed.waiting) parts.push(`${processed.waiting} warten${processed.limitReached ? " (Tageslimit erreicht – gehen morgen raus)" : " (werden in den nächsten Minuten verschickt)"}`);
  }
  if (skipped.length) parts.push(`${skipped.length} übersprungen`);
  return { ok: created.length > 0, message: `${parts.join(", ")}.`, queued: created.length, skipped, processed };
}

/* ---------------- processing ---------------- */

export interface ProcessResult {
  sent: number;
  failed: number;
  skipped: number;
  /** Due mails still queued after this run (limit, batch size or time budget). */
  waiting: number;
  limitReached: boolean;
  limit: number;
  sentToday: number;
  provider: MailResult["provider"];
  error?: string;
}

/**
 * Sends due queued mails: at most the rest of today's limit (OUTREACH_DAILY_LIMIT,
 * Vienna date), BATCH_SIZE per run, within TIME_BUDGET_MS. Called by the admin
 * ("Warteschlange jetzt abarbeiten"), right after "Jetzt senden" and by the cron.
 */
export async function processOutreachQueue(now = new Date()): Promise<ProcessResult> {
  const provider = mailProvider();
  const limit = dailyLimit();
  const secret = outreachSecret();
  const base = { sent: 0, failed: 0, skipped: 0, waiting: 0, limitReached: false, limit, sentToday: 0, provider };

  let sends = await getOutreachSends();
  const stale = new Set(staleSending(sends, now).map((s) => s.id));
  if (stale.size) {
    sends = await updateOutreachSends((list) => list.map((s) => (stale.has(s.id) && s.status === "sending"
      ? { ...s, status: "failed", error: "Abgebrochen – unklar, ob die Mail rausging (nicht erneut gesendet)" }
      : s)));
  }
  const remaining = remainingToday(sends, now, limit, TZ);
  const dueAll = dueSends(sends, now, Number.MAX_SAFE_INTEGER);
  if (!secret) return { ...base, waiting: dueAll.length, sentToday: limit - remaining, error: "ADMIN_SECRET oder AUTH_SECRET fehlt – nichts gesendet." };
  const pick = dueSends(sends, now, Math.min(remaining, BATCH_SIZE));
  if (!pick.length) return { ...base, waiting: dueAll.length, limitReached: dueAll.length > 0 && remaining <= 0, sentToday: limit - remaining };

  // Claim, so an overlapping run (cron + button) does not send the same mail twice.
  const claimAt = now.toISOString();
  const ids = new Set(pick.map((s) => s.id));
  const claimed: OutreachSend[] = [];
  await updateOutreachSends((list) => list.map((s) => {
    if (!ids.has(s.id) || s.status !== "queued") return s;
    const c = { ...s, status: "sending" as const, claimedAt: claimAt };
    claimed.push(c);
    return c;
  }));

  const [templates, contacts, blocked, { brand, siteUrl, replyTo }] = await Promise.all([getOutreachTemplates(), getOutreachContacts(), unsubscribedSet(), brandAndSite()]);
  const started = Date.now();
  const result = { ...base };
  const released: string[] = [];

  for (const [i, send] of claimed.entries()) {
    if (Date.now() - started > TIME_BUDGET_MS) { released.push(...claimed.slice(i).map((s) => s.id)); break; }
    const contact = contacts.find((c) => c.id === send.contactId);
    const decision = sendDecision(send, contact, blocked);
    if (!decision.send) {
      result.skipped++;
      await finishSend(send.id, { status: decision.cancel ? "cancelled" : "skipped", reason: decision.reason });
      if (contact) await addEvents(contact.id, [ev("skipped", `„${send.templateName}“ nicht gesendet: ${decision.reason}`, send.id)]);
      continue;
    }
    const template = templates.find((t) => t.id === send.templateId);
    if (!template) {
      result.failed++;
      await finishSend(send.id, { status: "failed", error: "Vorlage gelöscht" });
      await addEvents(contact!.id, [ev("failed", `„${send.templateName}“ nicht gesendet: Vorlage gelöscht`, send.id)]);
      continue;
    }

    const links: string[] = [];
    const track = (url: string) => {
      let idx = links.indexOf(url);
      if (idx < 0) { links.push(url); idx = links.length - 1; }
      return `${siteUrl}/api/o/c/${send.token}?i=${idx}`;
    };
    const unsub = unsubscribeLinks(siteUrl, contact!.email, secret);
    const mail = renderOutreachMail({
      template,
      contact: contact!,
      brand,
      link: track,
      pixelUrl: `${siteUrl}/api/o/o/${send.token}`,
      unsubscribeUrl: unsub.page,
    });

    let res: MailResult;
    try {
      const attachments = await loadAttachments(template);
      res = await sendMail({
        to: contact!.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        replyTo,
        attachments,
        headers: listUnsubscribeHeaders(unsub.oneClick, replyTo),
        tags: { type: "outreach" },
      });
    } catch (err) {
      res = { sent: false, provider, error: err instanceof Error ? err.message : String(err) };
    }
    const ok = res.sent || res.provider === "console";
    const sentAt = new Date();
    if (ok) {
      result.sent++;
      const follow = followUpOf(send, sentAt, { id: newId("snd"), token: trackingToken(), templateName: templates.find((t) => t.id === send.followUp?.templateId)?.name ?? "Nachfassen" });
      await updateOutreachSends((list) => [
        ...list.map((s) => (s.id === send.id ? { ...s, status: "sent" as const, sentAt: sentAt.toISOString(), subject: mail.subject, links, provider: res.provider } : s)),
        ...(follow ? [follow] : []),
      ]);
      await updateOutreachContact(contact!.id, (c) => {
        const history = [...c.history, ev("sent", `„${template.name}“ gesendet${res.provider === "console" ? " (nur Server-Log, kein Mailversand eingerichtet)" : ""}: ${mail.subject}`, send.id, sentAt.toISOString())];
        if (follow) history.push(ev("queued", `Nachfassen „${follow.templateName}“ geplant für ${localDate(new Date(follow.scheduledFor), TZ)} (nur wenn Status dann noch „Angeschrieben“)`, follow.id, sentAt.toISOString()));
        const moved = c.status === "neu";
        if (moved) history.push(ev("status", `Status: ${STATUS_LABELS.neu} → ${STATUS_LABELS.angeschrieben} (automatisch)`, undefined, sentAt.toISOString()));
        return { ...c, status: moved ? "angeschrieben" : c.status, lastMailedAt: sentAt.toISOString(), updatedAt: sentAt.toISOString(), history };
      });
    } else {
      result.failed++;
      await finishSend(send.id, { status: "failed", error: res.error ?? "Versand fehlgeschlagen", provider: res.provider });
      await addEvents(contact!.id, [ev("failed", `„${template.name}“ fehlgeschlagen: ${res.error ?? "Fehler"}`, send.id)]);
    }
    if (res.provider === "resend" && i < claimed.length - 1) await sleep(RESEND_PAUSE_MS);
  }

  if (released.length) {
    const r = new Set(released);
    await updateOutreachSends((list) => list.map((s) => (r.has(s.id) && s.status === "sending" ? { ...s, status: "queued" as const, claimedAt: undefined } : s)));
  }

  const after = await getOutreachSends();
  const left = remainingToday(after, new Date(), limit, TZ);
  const waiting = dueSends(after, new Date(), Number.MAX_SAFE_INTEGER).length;
  return { ...result, waiting, limitReached: waiting > 0 && left <= 0, sentToday: limit - left };
}

async function finishSend(id: string, patch: Partial<OutreachSend>) {
  await updateOutreachSends((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
}

async function addEvents(contactId: string, events: OutreachEvent[]) {
  await updateOutreachContact(contactId, (c) => ({ ...c, history: [...c.history, ...events] }));
}

/** Cancels queued sends (admin). */
export async function cancelSends(ids: string[]): Promise<number> {
  const set = new Set(ids);
  let n = 0;
  const changed: OutreachSend[] = [];
  await updateOutreachSends((list) => list.map((s) => {
    if (!set.has(s.id) || s.status !== "queued") return s;
    n++;
    const c = { ...s, status: "cancelled" as const, reason: "Im Admin abgebrochen" };
    changed.push(c);
    return c;
  }));
  for (const s of changed) await addEvents(s.contactId, [ev("cancelled", `„${s.templateName}“ aus der Warteschlange genommen`, s.id)]).catch(() => undefined);
  return n;
}

/* ---------------- test mail ---------------- */

export async function sendOutreachTest(template: OutreachTemplate, to: string, contact?: OutreachContact): Promise<MailResult> {
  const secret = outreachSecret();
  const { brand, siteUrl, replyTo } = await brandAndSite();
  const unsub = secret ? unsubscribeLinks(siteUrl, to, secret) : { page: `${siteUrl}/e-mail-abmelden`, oneClick: `${siteUrl}/api/outreach/unsubscribe` };
  const mail = renderOutreachMail({
    template,
    contact: contact ?? { ...SAMPLE_CONTACT },
    brand,
    unsubscribeUrl: unsub.page,
    subjectPrefix: "[TEST] ",
  });
  const attachments = await loadAttachments(template);
  return sendMail({
    to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    replyTo,
    attachments,
    headers: secret ? listUnsubscribeHeaders(unsub.oneClick, replyTo) : undefined,
    tags: { type: "outreach-test" },
    bypassRedirect: true,
  });
}

/* ---------------- tracking ---------------- */

const OPEN_DEDUP_MS = 10 * 60_000;

/** Records an open (pixel). Repeated loads within 10 minutes count once. */
export async function recordOpen(token: string): Promise<void> {
  let hit: OutreachSend | undefined;
  let first = false;
  const at = new Date();
  const sends = await getOutreachSends();
  const send = sends.find((s) => s.token === token && s.status === "sent");
  if (!send) return;
  if (send.lastOpenAt && at.getTime() - new Date(send.lastOpenAt).getTime() < OPEN_DEDUP_MS) return;
  await updateOutreachSends((list) => list.map((s) => {
    if (s.id !== send.id) return s;
    first = !s.firstOpenAt;
    hit = { ...s, opens: s.opens + 1, firstOpenAt: s.firstOpenAt ?? at.toISOString(), lastOpenAt: at.toISOString() };
    return hit;
  }));
  if (hit) await addEvents(send.contactId, [ev("open", `„${send.templateName}“ ${first ? "geöffnet" : "erneut geöffnet"} (ungefähr)`, send.id, at.toISOString())]).catch(() => undefined);
}

/** Records a click and returns the stored target (null = unknown token/index → shop home). */
export async function recordClick(token: string, index: string | null): Promise<string | null> {
  const sends = await getOutreachSends();
  const send = sends.find((s) => s.token === token);
  const url = clickTarget(send, index);
  if (!send || !url) return null;
  const at = new Date().toISOString();
  try {
    await updateOutreachSends((list) => list.map((s) => (s.id === send.id
      ? { ...s, clicks: [...s.clicks, { at, url }].slice(-50), ...(s.firstOpenAt ? {} : { firstOpenAt: at, lastOpenAt: at, opens: Math.max(1, s.opens) }) }
      : s)));
    await addEvents(send.contactId, [ev("click", `Link geklickt: ${url}`, send.id, at)]);
  } catch (err) {
    // The visitor still gets where the link points.
    console.error("[outreach] recording a click failed", err);
  }
  return url;
}

/* ---------------- unsubscribe ---------------- */

/** Puts an address on the unsubscribe list, cancels its queued mails and notes it on the contact. */
export async function unsubscribeOutreach(email: string, source: OutreachUnsubscribe["source"]): Promise<"removed" | "already"> {
  const addr = normalizeEmail(email);
  const list = await getOutreachUnsubscribed();
  const already = list.some((u) => normalizeEmail(u.email) === addr);
  const at = new Date().toISOString();
  if (!already) await saveOutreachUnsubscribed([...list, { email: addr, at, source }]);
  const sends = await getOutreachSends();
  const queued = sends.filter((s) => normalizeEmail(s.email) === addr && s.status === "queued");
  if (queued.length) {
    const ids = new Set(queued.map((s) => s.id));
    await updateOutreachSends((l) => l.map((s) => (ids.has(s.id) && s.status === "queued" ? { ...s, status: "cancelled" as const, reason: "Abgemeldet" } : s)));
  }
  if (!already) {
    const contacts = await getOutreachContacts();
    const hit = contacts.filter((c) => normalizeEmail(c.email) === addr);
    if (hit.length) {
      const text = source === "admin" ? "Im Admin als abgemeldet markiert" : "Hat sich von weiteren E-Mails abgemeldet";
      await saveOutreachContacts(contacts.map((c) => (normalizeEmail(c.email) === addr ? { ...c, history: [...c.history, ev("unsubscribed", text, undefined, at)] } : c)));
    }
  }
  return already ? "already" : "removed";
}

/** Removes an address from the unsubscribe list (admin, e.g. after the business asked to be contacted again). */
export async function resubscribeOutreach(email: string) {
  const addr = normalizeEmail(email);
  const list = await getOutreachUnsubscribed();
  await saveOutreachUnsubscribed(list.filter((u) => normalizeEmail(u.email) !== addr));
}

