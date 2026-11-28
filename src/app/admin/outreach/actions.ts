"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import {
  canPersistData, getOutreachContacts, getOutreachTemplates, saveOutreachContacts, saveOutreachTemplates, updateOutreachContact,
} from "@/lib/cms";
import { publicUrl } from "@/lib/uploads";
import { OUTREACH_CATEGORIES, OUTREACH_STATUSES, type OutreachCategory, type OutreachContact, type OutreachStatus, type OutreachTemplate } from "@/types/outreach";
import { isValidEmail, normalizeEmail, STATUS_LABELS } from "@/lib/outreach/format";
import { applyImport, previewImport, type ImportPreview } from "@/lib/outreach/import";
import { parseContactInput, parseTemplateInput } from "@/lib/outreach/validate";
import { newId } from "@/lib/outreach/tokens";
import { DEFAULT_FOLLOW_UP_DAYS, localToUtc } from "@/lib/outreach/queue";
import {
  cancelSends, processOutreachQueue, queueOutreach, resubscribeOutreach, sendOutreachTest, unsubscribedSet, unsubscribeOutreach,
  type ProcessResult, type QueueResult,
} from "@/lib/outreach/service";

export type OutreachActionResult = { ok: boolean; message: string; id?: string };

const BASE = "/admin/outreach";
const revalidate = () => revalidatePath(BASE, "layout");
const nowIso = () => new Date().toISOString();

async function guard(): Promise<OutreachActionResult | null> {
  await requireAdmin();
  if (!(await canPersistData())) return { ok: false, message: "Kein Speicher verfügbar – ohne Datenbank können Outreach-Daten nicht gespeichert werden." };
  return null;
}

/* ---------------- contacts ---------------- */

export async function saveOutreachContactAction(id: string | null, input: unknown): Promise<OutreachActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  const parsed = parseContactInput(input);
  if (!parsed.ok) return { ok: false, message: parsed.error };
  const v = parsed.value;
  const contacts = await getOutreachContacts();
  const clash = contacts.find((c) => normalizeEmail(c.email) === v.email && c.id !== id);
  if (clash) return { ok: false, message: `Diese E-Mail-Adresse gehört schon zu „${clash.company || clash.email}“.`, id: clash.id };
  const at = nowIso();
  if (!id) {
    const contact: OutreachContact = { id: newId("ctc"), ...v, noteEntries: [], history: [{ at, type: "created", text: "Kontakt angelegt" }], createdAt: at, updatedAt: at };
    await saveOutreachContacts([...contacts, contact]);
    revalidate();
    return { ok: true, message: "Kontakt angelegt.", id: contact.id };
  }
  const idx = contacts.findIndex((c) => c.id === id);
  if (idx === -1) return { ok: false, message: "Kontakt nicht gefunden." };
  const old = contacts[idx];
  const history = [...old.history];
  if (old.status !== v.status) history.push({ at, type: "status", text: `Status: ${STATUS_LABELS[old.status]} → ${STATUS_LABELS[v.status]}` });
  else history.push({ at, type: "updated", text: "Daten bearbeitet" });
  contacts[idx] = { ...old, ...v, history, updatedAt: at };
  await saveOutreachContacts(contacts);
  revalidate();
  return { ok: true, message: "Gespeichert.", id };
}

export async function deleteOutreachContactAction(id: string): Promise<OutreachActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  const contacts = await getOutreachContacts();
  if (!contacts.some((c) => c.id === id)) return { ok: false, message: "Kontakt nicht gefunden." };
  await saveOutreachContacts(contacts.filter((c) => c.id !== id));
  revalidate();
  return { ok: true, message: "Kontakt gelöscht." };
}

export async function setOutreachStatusAction(id: string, status: string): Promise<OutreachActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  const next = OUTREACH_STATUSES.find((s) => s === status) as OutreachStatus | undefined;
  if (!next) return { ok: false, message: "Unbekannter Status." };
  const at = nowIso();
  const updated = await updateOutreachContact(id, (c) => (c.status === next ? c : {
    ...c, status: next, updatedAt: at, history: [...c.history, { at, type: "status", text: `Status: ${STATUS_LABELS[c.status]} → ${STATUS_LABELS[next]}` }],
  }));
  if (!updated) return { ok: false, message: "Kontakt nicht gefunden." };
  revalidate();
  return { ok: true, message: `Status: ${STATUS_LABELS[next]}` };
}

export async function addOutreachNoteAction(id: string, text: string): Promise<OutreachActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  const clean = typeof text === "string" ? text.trim().slice(0, 4000) : "";
  if (!clean) return { ok: false, message: "Die Notiz ist leer." };
  const at = nowIso();
  const updated = await updateOutreachContact(id, (c) => ({ ...c, updatedAt: at, noteEntries: [{ id: newId("note"), at, text: clean }, ...c.noteEntries] }));
  if (!updated) return { ok: false, message: "Kontakt nicht gefunden." };
  revalidate();
  return { ok: true, message: "Notiz gespeichert." };
}

export async function deleteOutreachNoteAction(id: string, noteId: string): Promise<OutreachActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  const updated = await updateOutreachContact(id, (c) => ({ ...c, noteEntries: c.noteEntries.filter((n) => n.id !== noteId) }));
  if (!updated) return { ok: false, message: "Kontakt nicht gefunden." };
  revalidate();
  return { ok: true, message: "Notiz gelöscht." };
}

export async function setOutreachUnsubscribedAction(email: string, unsubscribed: boolean): Promise<OutreachActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  const addr = normalizeEmail(String(email ?? ""));
  if (!isValidEmail(addr)) return { ok: false, message: "Ungültige Adresse." };
  if (unsubscribed) await unsubscribeOutreach(addr, "admin");
  else await resubscribeOutreach(addr);
  revalidate();
  return { ok: true, message: unsubscribed ? "Als abgemeldet markiert – bekommt keine Outreach-Mails mehr." : "Abmeldung aufgehoben." };
}

/* ---------------- import ---------------- */

const category = (v: unknown): OutreachCategory | undefined => OUTREACH_CATEGORIES.find((c) => c === v);

export async function previewOutreachImportAction(text: string, defaultCategory?: string): Promise<{ ok: true; preview: ImportPreview } | { ok: false; message: string }> {
  await requireAdmin();
  if (typeof text !== "string" || !text.trim()) return { ok: false, message: "Keine Daten – bitte Datei wählen oder Tabelle einfügen." };
  if (text.length > 2_000_000) return { ok: false, message: "Die Datei ist zu groß (max. ca. 2 MB Text)." };
  const [contacts, blocked] = await Promise.all([getOutreachContacts(), unsubscribedSet()]);
  const preview = previewImport(text, contacts, [...blocked], category(defaultCategory));
  if (preview.rows.length > 5000) return { ok: false, message: "Höchstens 5.000 Zeilen pro Import." };
  return { ok: true, preview };
}

export async function applyOutreachImportAction(text: string, mode: "skip" | "update", defaultCategory?: string): Promise<OutreachActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  const pre = await previewOutreachImportAction(text, defaultCategory);
  if (!pre.ok) return { ok: false, message: pre.message };
  const contacts = await getOutreachContacts();
  const r = applyImport(contacts, pre.preview.rows, mode === "update" ? "update" : "skip", nowIso(), () => newId("ctc"));
  await saveOutreachContacts(r.contacts);
  revalidate();
  return { ok: true, message: `${r.added} neu angelegt, ${r.updated} aktualisiert, ${r.skipped} übersprungen.` };
}

/* ---------------- templates ---------------- */

export async function saveOutreachTemplateAction(id: string | null, input: unknown): Promise<OutreachActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  const parsed = parseTemplateInput(input, publicUrl);
  if (!parsed.ok) return { ok: false, message: parsed.error };
  const templates = await getOutreachTemplates();
  const at = nowIso();
  if (!id) {
    const t: OutreachTemplate = { id: newId("tpl"), ...parsed.value, createdAt: at, updatedAt: at };
    await saveOutreachTemplates([...templates, t]);
    revalidate();
    return { ok: true, message: "Vorlage angelegt.", id: t.id };
  }
  const idx = templates.findIndex((t) => t.id === id);
  if (idx === -1) return { ok: false, message: "Vorlage nicht gefunden." };
  const { starter } = templates[idx];
  templates[idx] = { id, ...parsed.value, createdAt: templates[idx].createdAt, updatedAt: at, ...(starter ? { starter } : {}) };
  await saveOutreachTemplates(templates);
  revalidate();
  return { ok: true, message: "Vorlage gespeichert.", id };
}

export async function duplicateOutreachTemplateAction(id: string): Promise<OutreachActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  const templates = await getOutreachTemplates();
  const src = templates.find((t) => t.id === id);
  if (!src) return { ok: false, message: "Vorlage nicht gefunden." };
  const at = nowIso();
  const copy: OutreachTemplate = { ...src, id: newId("tpl"), name: `${src.name} (Kopie)`.slice(0, 120), starter: undefined, createdAt: at, updatedAt: at };
  await saveOutreachTemplates([...templates, copy]);
  revalidate();
  return { ok: true, message: "Vorlage dupliziert.", id: copy.id };
}

export async function deleteOutreachTemplateAction(id: string): Promise<OutreachActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  const templates = await getOutreachTemplates();
  if (!templates.some((t) => t.id === id)) return { ok: false, message: "Vorlage nicht gefunden." };
  await saveOutreachTemplates(templates.filter((t) => t.id !== id));
  revalidate();
  return { ok: true, message: "Vorlage gelöscht." };
}

/* ---------------- sending ---------------- */

export async function sendOutreachTestAction(templateInput: unknown, to: string, contactId?: string): Promise<OutreachActionResult> {
  await requireAdmin();
  const addr = normalizeEmail(String(to ?? ""));
  if (!isValidEmail(addr)) return { ok: false, message: "Bitte genau eine gültige E-Mail-Adresse eingeben." };
  const parsed = parseTemplateInput(templateInput, publicUrl);
  if (!parsed.ok) return { ok: false, message: parsed.error };
  const at = nowIso();
  const contact = contactId ? (await getOutreachContacts()).find((c) => c.id === contactId) : undefined;
  try {
    const res = await sendOutreachTest({ id: "test", ...parsed.value, createdAt: at, updatedAt: at }, addr, contact);
    if (res.provider === "console") return { ok: true, message: `Kein Mailversand eingerichtet (SMTP_HOST oder RESEND_API_KEY fehlt) – die Test-Mail an ${addr} steht nur im Server-Log.` };
    if (!res.sent) return { ok: false, message: `Nicht gesendet: ${res.error ?? "Fehler"}` };
    return { ok: true, message: `Test-Mail an ${addr} gesendet.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Fehler beim Senden." };
  }
}

export interface QueueActionInput {
  templateId: string;
  contactIds: string[];
  mode: "now" | "later";
  date?: string;
  time?: string;
  followUp?: { enabled: boolean; days: number; templateId: string };
  allowRecent: boolean;
}

export async function queueOutreachAction(input: QueueActionInput): Promise<QueueResult> {
  const blocked = await guard();
  if (blocked) return { ok: false, message: blocked.message, queued: 0, skipped: [] };
  const ids = Array.isArray(input?.contactIds) ? input.contactIds.filter((x): x is string => typeof x === "string").slice(0, 2000) : [];
  if (!ids.length) return { ok: false, message: "Bitte mindestens einen Kontakt auswählen.", queued: 0, skipped: [] };
  let scheduledFor: string | undefined;
  if (input.mode === "later") {
    const at = localToUtc(String(input.date ?? ""), String(input.time ?? ""));
    if (!at) return { ok: false, message: "Bitte Datum und Uhrzeit für den Versand angeben.", queued: 0, skipped: [] };
    if (at.getTime() < Date.now() - 60_000) return { ok: false, message: "Der Zeitpunkt liegt in der Vergangenheit.", queued: 0, skipped: [] };
    scheduledFor = at.toISOString();
  }
  let followUp: { days: number; templateId: string } | null = null;
  if (input.followUp?.enabled) {
    const days = Math.round(Number(input.followUp.days) || DEFAULT_FOLLOW_UP_DAYS);
    if (days < 1 || days > 90) return { ok: false, message: "Nachfassen: 1 bis 90 Tage.", queued: 0, skipped: [] };
    if (!input.followUp.templateId) return { ok: false, message: "Nachfassen: bitte eine Vorlage wählen.", queued: 0, skipped: [] };
    followUp = { days, templateId: String(input.followUp.templateId) };
  }
  const result = await queueOutreach({ templateId: String(input.templateId ?? ""), contactIds: ids, scheduledFor, followUp, allowRecent: Boolean(input.allowRecent) });
  revalidate();
  return result;
}

export async function processOutreachQueueAction(): Promise<ProcessResult & { message: string }> {
  await requireAdmin();
  const r = await processOutreachQueue();
  revalidate();
  const parts = [`${r.sent} gesendet`];
  if (r.failed) parts.push(`${r.failed} fehlgeschlagen`);
  if (r.skipped) parts.push(`${r.skipped} übersprungen`);
  if (r.waiting) parts.push(`${r.waiting} warten${r.limitReached ? " (Tageslimit erreicht)" : ""}`);
  return { ...r, message: r.error ?? `${parts.join(", ")}. Heute ${r.sentToday} von ${r.limit}.` };
}

export async function cancelOutreachSendsAction(ids: string[]): Promise<OutreachActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  const n = await cancelSends(Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : []);
  revalidate();
  return { ok: true, message: `${n} Mail${n === 1 ? "" : "s"} aus der Warteschlange genommen.` };
}
