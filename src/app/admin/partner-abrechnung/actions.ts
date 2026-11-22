"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  getOrders, getPartnerLedgerEntries, getPartnerPortalSettings, getPartners, savePartnerLedgerEntries, savePartnerPortalSettings, updateOrder,
} from "@/lib/cms";
import { requireAdmin } from "@/lib/admin-session";
import { effectivePartner } from "@/lib/partners";
import { inBillingPeriod } from "@/lib/partner-ledger";
import type { PartnerLedgerEntry } from "@/types/partner-portal";

export type BillingActionState = { ok: boolean; message: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AMOUNT = 100_000;

function revalidate(partnerId: string) {
  revalidatePath("/admin/partner-abrechnung");
  revalidatePath(`/admin/partner-abrechnung/${partnerId}`);
  revalidatePath("/partner");
}

async function partnerOf(formData: FormData) {
  const id = String(formData.get("partnerId") ?? "");
  return (await getPartners()).find((p) => p.id === id) ?? null;
}

/** "12,50" / "-7.5" → number (2 decimals) or null. */
function parseAmount(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").replace(/\s|€/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Math.round(Number(s) * 100) / 100;
  return Number.isFinite(n) && Math.abs(n) <= MAX_AMOUNT ? n : null;
}

/** Portal login addresses of one partner. Empty + "Auftrags-Adressen verwenden" = default. */
export async function savePortalEmailsAction(_prev: BillingActionState, formData: FormData): Promise<BillingActionState> {
  try {
    await requireAdmin();
    const partner = await partnerOf(formData);
    if (!partner) return { ok: false, message: "Partner nicht gefunden." };
    const useDefault = formData.get("useDefault") === "on";
    const list = String(formData.get("emails") ?? "").split(/[\s,;]+/).map((a) => a.trim().toLowerCase()).filter(Boolean);
    const bad = list.filter((a) => !EMAIL_RE.test(a) || a.length > 254);
    if (bad.length) return { ok: false, message: `Ungültige Adresse: ${bad.join(", ")}` };
    if (list.length > 10) return { ok: false, message: "Höchstens 10 Adressen." };
    const doc = await getPartnerPortalSettings();
    const current = doc[partner.id] ?? {};
    const next = { ...current, updatedAt: new Date().toISOString() };
    if (useDefault) delete next.emails;
    else next.emails = [...new Set(list)];
    await savePartnerPortalSettings({ ...doc, [partner.id]: next });
    revalidate(partner.id);
    return { ok: true, message: useDefault ? "Gespeichert: es gelten die Auftrags-Adressen." : next.emails?.length ? `Gespeichert: ${next.emails.length} Adresse(n) dürfen sich anmelden.` : "Gespeichert: niemand kann sich anmelden." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }
}

/** "Abrechnung ab": only orders created after the chosen order count. Empty = everything. */
export async function saveBillingFromAction(_prev: BillingActionState, formData: FormData): Promise<BillingActionState> {
  try {
    await requireAdmin();
    const partner = await partnerOf(formData);
    if (!partner) return { ok: false, message: "Partner nicht gefunden." };
    const orderId = String(formData.get("orderId") ?? "").trim();
    const doc = await getPartnerPortalSettings();
    const next = { ...(doc[partner.id] ?? {}), updatedAt: new Date().toISOString() };
    if (!orderId) {
      delete next.billingFrom;
    } else {
      const order = (await getOrders()).find((o) => o.id === orderId);
      if (!order) return { ok: false, message: "Bestellung nicht gefunden." };
      next.billingFrom = { orderId: order.id, createdAt: order.createdAt, setAt: new Date().toISOString() };
    }
    await savePartnerPortalSettings({ ...doc, [partner.id]: next });
    revalidate(partner.id);
    return { ok: true, message: orderId ? `Gespeichert: es zählen Bestellungen nach ${orderId}.` : "Gespeichert: es zählen alle Bestellungen." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }
}

/** Adds ("Zahlung erfassen" / "Korrektur") or – with `entryId` – updates a ledger entry. */
export async function saveLedgerEntryAction(_prev: BillingActionState, formData: FormData): Promise<BillingActionState> {
  try {
    await requireAdmin();
    const partner = await partnerOf(formData);
    if (!partner) return { ok: false, message: "Partner nicht gefunden." };
    const kind = formData.get("kind") === "correction" ? "correction" : "payment";
    const amount = parseAmount(formData.get("amount"));
    const date = String(formData.get("date") ?? "");
    const note = String(formData.get("note") ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
    if (amount === null || amount === 0) return { ok: false, message: "Bitte einen Betrag eingeben, z. B. 120,50." };
    if (kind === "payment" && amount < 0) return { ok: false, message: "Eine Zahlung ist immer positiv – für Abzüge bitte eine Korrektur erfassen." };
    if (!DATE_RE.test(date)) return { ok: false, message: "Bitte ein Datum wählen." };
    if (kind === "correction" && !note) return { ok: false, message: "Bitte einen Grund für die Korrektur angeben." };
    const list = await getPartnerLedgerEntries();
    const entryId = String(formData.get("entryId") ?? "");
    const now = new Date().toISOString();
    if (entryId) {
      const idx = list.findIndex((e) => e.id === entryId && e.partnerId === partner.id);
      if (idx === -1) return { ok: false, message: "Eintrag nicht gefunden." };
      list[idx] = { ...list[idx], amount, date, note, updatedAt: now };
    } else {
      const entry: PartnerLedgerEntry = { id: `pl_${randomBytes(6).toString("hex")}`, partnerId: partner.id, kind, amount, date, note, createdAt: now };
      list.push(entry);
    }
    await savePartnerLedgerEntries(list);
    revalidate(partner.id);
    return { ok: true, message: entryId ? "Eintrag geändert." : kind === "payment" ? "Zahlung erfasst." : "Korrektur erfasst." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }
}

export async function deleteLedgerEntryAction(_prev: BillingActionState, formData: FormData): Promise<BillingActionState> {
  try {
    await requireAdmin();
    const partner = await partnerOf(formData);
    if (!partner) return { ok: false, message: "Partner nicht gefunden." };
    const entryId = String(formData.get("entryId") ?? "");
    const list = await getPartnerLedgerEntries();
    const next = list.filter((e) => !(e.id === entryId && e.partnerId === partner.id));
    if (next.length === list.length) return { ok: false, message: "Eintrag nicht gefunden." };
    await savePartnerLedgerEntries(next);
    revalidate(partner.id);
    return { ok: true, message: "Eintrag gelöscht." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Löschen fehlgeschlagen." };
  }
}

/**
 * "Aufträge ohne Partner zuordnen": paid orders without (effective) partner are assigned
 * to this partner – WITHOUT order slip, mail or courier booking. Optionally counted as
 * confirmed right away (they were bound already).
 */
export async function assignOrdersWithoutPartnerAction(_prev: BillingActionState, formData: FormData): Promise<BillingActionState> {
  try {
    await requireAdmin();
    const partner = await partnerOf(formData);
    if (!partner) return { ok: false, message: "Partner nicht gefunden." };
    const ids = [...new Set(formData.getAll("orderId").map(String))];
    if (!ids.length) return { ok: false, message: "Bitte mindestens eine Bestellung ankreuzen." };
    const confirmed = formData.get("confirmed") === "on";
    const settings = (await getPartnerPortalSettings())[partner.id];
    const done: string[] = [];
    const skipped: string[] = [];
    for (const id of ids) {
      const at = new Date().toISOString();
      let changed = false;
      await updateOrder(id, (o) => {
        if (o.payment.status !== "paid" || effectivePartner(o) || !inBillingPeriod(o, settings?.billingFrom)) return o;
        changed = true;
        return {
          ...o,
          partner: { id: partner.id, name: partner.name, assignedAt: at, manual: true, ...(confirmed ? { confirmedAt: at } : {}) },
          history: [...o.history, { status: o.status, at, note: `Nachträglich ${partner.name} zugeordnet (Partner-Abrechnung, ohne Auftragsmail)${confirmed ? " – als bestätigt gezählt" : ""}` }],
        };
      });
      (changed ? done : skipped).push(id);
    }
    revalidate(partner.id);
    for (const id of done) revalidatePath(`/admin/bestellungen/${id}`);
    revalidatePath("/admin/bestellungen");
    return { ok: done.length > 0, message: `${done.length} Bestellung(en) ${partner.name} zugeordnet – ohne Mail.${skipped.length ? ` Übersprungen (schon zugeordnet, nicht bezahlt oder vor „Abrechnung ab“): ${skipped.join(", ")}.` : ""}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Zuordnen fehlgeschlagen." };
  }
}
