"use server";

import { trackCancelled, trackDelivered } from "@/lib/analytics-server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getPartners, getSettings, updateOrder } from "@/lib/cms";
import { requireAdmin } from "@/lib/admin-session";
import { ORDER_MAIL_LABELS, sendOrderMails, sendOrderStatusUpdate, sendPartnerCancellation, sendPartnerOrder, type MailResult, type OrderMailKind } from "@/lib/mail";
import { attachFloristBudgets, getFloristBudgets } from "@/lib/florist-budget";
import { releaseStock } from "@/lib/orders";
import { expireStaleOrders } from "@/lib/stale-orders";
import { deleteCheckoutDraft, pruneCheckoutDrafts } from "@/lib/checkout-drafts";
import { bookCourier, cancelCourier } from "@/lib/courier";
import { sendManualReviewRequest } from "@/lib/mail/review-requests";
import { formatDateTime } from "@/lib/format";
import { withEffectivePartner } from "@/lib/partners";
import type { Order, OrderStatus, Partner } from "@/types";

export type OrderActionState = { ok: boolean; message: string } | null;

function revalidateOrder(id: string) {
  revalidatePath("/admin/bestellungen");
  revalidatePath(`/admin/bestellungen/${id}`);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

/** Change the status and append an entry (with optional note) to the history. */
export async function updateOrderStatus(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  try {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "") as OrderStatus;
    const note = String(formData.get("note") ?? "").trim();
    const settings = await getSettings();
    const def = settings.orderStatuses.find((s) => s.key === status);
    if (!id || !def) return { ok: false, message: "Ungültiger Status." };

    const prev: { status?: OrderStatus } = {};
    const updated = await updateOrder(id, (o) => {
      prev.status = o.status;
      return {
        ...o,
        status,
        history: [...o.history, { status, at: new Date().toISOString(), ...(note ? { note } : {}) }],
      };
    });
    if (!updated) return { ok: false, message: "Bestellung nicht gefunden." };

    // Analytics (server-side, once per order, only with the customer's statistics consent).
    if (status === "delivered" && prev.status !== "delivered") await trackDelivered(id);
    if (status === "cancelled" && prev.status !== "cancelled") await trackCancelled(id);

    // A cancellation gives reserved units back – unless a failed payment already did.
    if (status === "cancelled" && prev.status !== "cancelled" && updated.payment.status !== "failed") {
      await releaseStock(updated.lines);
    }
    // …and a booked rider is called off.
    let courierNote = "";
    if (status === "cancelled" && updated.courier?.deliveryId && !["cancel", "failed"].includes(updated.courier.status)) {
      const c = await cancelCourier(id);
      courierNote = c.ok ? " Fahrer wurde storniert." : ` Fahrer konnte nicht storniert werden: ${c.message}`;
    }
    // …and the partner florist that already got the order slip gets a cancellation.
    let partnerNote = "";
    const withPartner = withEffectivePartner(updated);
    if (status === "cancelled" && prev.status !== "cancelled" && withPartner.partner?.sentAt && !withPartner.partner.cancelSentAt) {
      const r = await cancelAtPartner(withPartner, "cancelled");
      partnerNote = ` ${r.message}`;
    }
    revalidateOrder(id);

    // Customer notification – only for real changes to a customer-visible status.
    // A failing mail must never break the status change.
    let mailNote = "";
    if (def.customerVisible && prev.status !== status) {
      try {
        const result = await sendOrderStatusUpdate(updated);
        if (result.sent) mailNote = " Kund:in wurde per E-Mail informiert.";
        else if (result.provider === "console") mailNote = " (E-Mail nur im Log – kein Mail-Provider konfiguriert.)";
        else mailNote = " Die E-Mail an die Kund:in konnte nicht gesendet werden.";
      } catch (err) {
        console.error("[mail] status update failed", err);
        mailNote = " Die E-Mail an die Kund:in konnte nicht gesendet werden.";
      }
    }
    // Optional: send the review request right away (checkbox next to "Zugestellt").
    let reviewNote = "";
    if (status === "delivered" && formData.get("sendReviewRequest") === "on") {
      const r = await sendReviewRequestAndLog(updated);
      reviewNote = ` ${r.message}`;
    }
    return { ok: true, message: `Status auf „${def.label}“ gesetzt.${mailNote}${courierNote}${partnerNote}${reviewNote}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Fehler beim Speichern." };
  }
}

/**
 * Sends the review request mail for one order and notes it in the order history.
 * The request is recorded in data/review-requests.json (sentAt), so the daily
 * cron does not send it a second time.
 */
async function sendReviewRequestAndLog(order: Order): Promise<{ ok: boolean; message: string }> {
  try {
    const r = await sendManualReviewRequest(order);
    if (!r.ok) return { ok: false, message: `Bewertungsanfrage nicht gesendet: ${r.message}` };
    await updateOrder(order.id, (o) => ({
      ...o,
      history: [...o.history, { status: o.status, at: r.sentAt, note: r.result.sent ? `Bewertungsanfrage an ${o.customer.email} gesendet (manuell)` : "Bewertungsanfrage nur ins Server-Log geschrieben (kein Mail-Provider)" }],
    }));
    revalidateOrder(order.id);
    const where = r.result.sent ? `an ${order.customer.email} gesendet` : "nur ins Server-Log geschrieben (kein Mail-Provider konfiguriert)";
    const hint = r.notDelivered ? " Hinweis: Die Bestellung ist noch nicht „Zugestellt“ – der Link funktioniert erst nach der Zustellung." : "";
    return { ok: r.result.sent, message: `Bewertungsanfrage ${where} (${formatDateTime(r.sentAt)}).${hint}` };
  } catch (err) {
    console.error("[mail] review request failed", order.id, err);
    return { ok: false, message: "Bewertungsanfrage nicht gesendet: unerwarteter Fehler." };
  }
}

/** "Bewertungsanfrage jetzt senden" on the order detail page. */
export async function sendReviewRequestAction(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  try {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const { getOrderById } = await import("@/lib/cms");
    const order = await getOrderById(id);
    if (!order) return { ok: false, message: "Bestellung nicht gefunden." };
    return await sendReviewRequestAndLog(order);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Senden fehlgeschlagen." };
  }
}

/** Save the internal note (staff only, never shown to customers). */
export async function saveInternalNote(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  try {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const internalNote = String(formData.get("internalNote") ?? "").trim();
    const updated = await updateOrder(id, (o) => {
      const next = { ...o };
      if (internalNote) next.internalNote = internalNote;
      else delete next.internalNote;
      return next;
    });
    if (!updated) return { ok: false, message: "Bestellung nicht gefunden." };
    revalidateOrder(id);
    return { ok: true, message: "Interne Notiz gespeichert." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Fehler beim Speichern." };
  }
}

/** Book (or re-book after a failure/cancellation) a RiderX rider for this order. */
export async function bookCourierAction(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  try {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const result = await bookCourier(id, { manual: true });
    revalidateOrder(id);
    return result;
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Buchung fehlgeschlagen." };
  }
}

/** Cancel the RiderX delivery (free until 30 min before a planned pickup). */
export async function cancelCourierAction(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  try {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const result = await cancelCourier(id);
    revalidateOrder(id);
    return result;
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Stornierung fehlgeschlagen." };
  }
}

/**
 * Send the order mails of a PAID order again – to the real recipients (customer,
 * MAIL_ADMIN). For when a mail never arrived. Logged in the history. The partner's
 * order slip is sent from the "Partner" card (assignPartnerAction).
 */
export async function resendOrderMailsAction(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  try {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const which = String(formData.get("which") ?? "");
    const kinds: OrderMailKind[] | null =
      which === "all" ? ["customer", "internal"] : which === "customer" || which === "internal" ? [which] : null;
    if (!kinds) return { ok: false, message: "Bitte auswählen, welche Mail gesendet werden soll." };

    const { getOrderById } = await import("@/lib/cms");
    const order = await getOrderById(id);
    if (!order) return { ok: false, message: "Bestellung nicht gefunden." };
    if (order.payment.status !== "paid") return { ok: false, message: "Die Bestellung ist nicht bezahlt – es werden keine Mails gesendet." };

    const results = await sendOrderMails(order, kinds);
    const sent = results.filter((r) => r.result?.sent);
    const skipped = results.filter((r) => !r.result);
    const failed = results.filter((r) => r.result && !r.result.sent);
    const label = (r: (typeof results)[number]) => `${ORDER_MAIL_LABELS[r.kind]} an ${r.to.join(", ")}`;

    if (sent.length) {
      await updateOrder(id, (o) => ({
        ...o,
        history: [...o.history, { status: o.status, at: new Date().toISOString(), note: `Mail erneut gesendet: ${sent.map((r) => ORDER_MAIL_LABELS[r.kind]).join(", ")}` }],
      }));
      revalidateOrder(id);
    }
    const parts = [
      sent.length ? `Gesendet: ${sent.map(label).join("; ")}.` : "",
      failed.length ? `Nicht gesendet: ${failed.map((r) => `${ORDER_MAIL_LABELS[r.kind]} (${r.result?.provider === "console" ? "kein Mail-Provider" : r.result?.error ?? "Fehler"})`).join("; ")}.` : "",
      skipped.length ? `Übersprungen (keine Adresse hinterlegt): ${skipped.map((r) => ORDER_MAIL_LABELS[r.kind]).join(", ")}.` : "",
    ].filter(Boolean);
    return { ok: failed.length === 0 && sent.length > 0, message: parts.join(" ") };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Senden fehlgeschlagen." };
  }
}

/* ---------------- Partner florists ---------------- */

/** Sent – or, without a mail provider (development), written to the server log. */
const delivered = (r: MailResult | null) => Boolean(r && (r.sent || r.provider === "console"));
const logOnly = (r: MailResult | null) => (r && !r.sent && r.provider === "console" ? " (nur ins Server-Log – kein Mail-Provider)" : "");

const mailProblem = (r: MailResult | null) =>
  !r ? "keine E-Mail-Adresse hinterlegt (Admin → Partner)" : r.provider === "console" ? "kein Mail-Provider konfiguriert" : r.error ?? "Fehler beim Senden";

async function findPartner(id: string): Promise<Partner | null> {
  return (await getPartners()).find((p) => p.id === id) ?? null;
}

/**
 * Sends the cancellation to the partner the order was sent to and notes it on the
 * order (cancelSentAt + history). Never throws.
 */
async function cancelAtPartner(order: Order, reason: "cancelled" | "reassigned"): Promise<{ ok: boolean; message: string }> {
  const assigned = order.partner;
  if (!assigned?.sentAt) return { ok: true, message: "" };
  try {
    const partner = (await findPartner(assigned.id)) ?? { id: assigned.id, name: assigned.name, emails: assigned.sentTo ?? [], active: false, sortOrder: 0 };
    const { to, result } = await sendPartnerCancellation(order, partner, reason);
    if (!delivered(result)) {
      const message = `ACHTUNG: Storno an ${assigned.name} NICHT gesendet (${mailProblem(result)}) – bitte sofort telefonisch absagen.`;
      await updateOrder(order.id, (o) => ({ ...o, history: [...o.history, { status: o.status, at: new Date().toISOString(), note: message }] }));
      return { ok: false, message };
    }
    const at = new Date().toISOString();
    await updateOrder(order.id, (o) => ({
      ...o,
      ...(!o.partner || o.partner.id === assigned.id ? { partner: { ...(o.partner ?? assigned), cancelSentAt: at } } : {}),
      history: [...o.history, { status: o.status, at, note: `Storno an ${assigned.name} gesendet (${to.join(", ")})${logOnly(result)}` }],
    }));
    return { ok: true, message: `Storno an ${assigned.name} gesendet${logOnly(result)}.` };
  } catch (err) {
    console.error("[partner] cancellation failed", order.id, err);
    return { ok: false, message: `ACHTUNG: Storno an ${assigned.name} NICHT gesendet – bitte sofort telefonisch absagen.` };
  }
}

/**
 * Assigns the order to a partner florist and sends them the order slip. Choosing the
 * same partner again re-sends the slip; choosing another one first sends the old
 * partner a cancellation ("wird von einer anderen Floristik übernommen").
 */
export async function assignPartnerAction(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  try {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const partnerId = String(formData.get("partnerId") ?? "");
    const floristNote = String(formData.get("floristNote") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 1000);
    const { getOrderById } = await import("@/lib/cms");
    const found = await getOrderById(id);
    if (!found) return { ok: false, message: "Bestellung nicht gefunden." };
    let order = withEffectivePartner(found);
    if (order.payment.status !== "paid") return { ok: false, message: "Die Bestellung ist nicht bezahlt – kein Auftrag an einen Partner." };
    if (order.status === "cancelled") return { ok: false, message: "Die Bestellung ist storniert – kein Auftrag an einen Partner." };
    const partner = await findPartner(partnerId);
    if (!partner) return { ok: false, message: "Bitte einen Partner auswählen." };
    if (!partner.active) return { ok: false, message: `${partner.name} ist im Admin als inaktiv markiert.` };

    // Moving to another partner: the old one must not bind it.
    const notes: string[] = [];
    if (order.partner?.sentAt && order.partner.id !== partner.id && !order.partner.cancelSentAt) {
      const c = await cancelAtPartner(order, "reassigned");
      if (!c.ok) return { ok: false, message: `${c.message} Der Auftrag wurde deshalb noch NICHT an ${partner.name} gesendet.` };
      notes.push(c.message);
      order = withEffectivePartner((await getOrderById(id)) ?? order);
    }

    // Orders from before the budget list carry no budget yet: fill it in.
    if (order.lines.every((l) => l.floristBudget === undefined)) {
      const budgets = await getFloristBudgets();
      order = (await updateOrder(id, (o) => ({ ...o, lines: attachFloristBudgets(o.lines, budgets) }))) ?? order;
    }

    const again = order.partner?.id === partner.id && Boolean(order.partner.sentAt) && !order.partner.cancelSentAt;
    const confirmToken = randomBytes(16).toString("hex");
    // The team note travels with the slip (and its reminders).
    order = { ...order, partner: { ...(order.partner ?? { id: partner.id, name: partner.name, assignedAt: new Date().toISOString() }), note: floristNote || undefined } };
    const { to, result } = await sendPartnerOrder(order, partner, confirmToken);
    const at = new Date().toISOString();
    if (!delivered(result)) {
      revalidateOrder(id);
      return { ok: false, message: [...notes, `Auftrag an ${partner.name} NICHT gesendet: ${mailProblem(result)}.`].join(" ") };
    }
    await updateOrder(id, (o) => ({
      ...o,
      partner: {
        id: partner.id, name: partner.name, assignedAt: again && o.partner ? o.partner.assignedAt : at, sentAt: at, sentTo: to, confirmToken,
        ...(floristNote ? { note: floristNote } : {}),
        // A re-sent slip keeps an earlier confirmation; a new partner has to confirm again.
        ...(again && o.partner?.confirmedAt ? { confirmedAt: o.partner.confirmedAt } : {}),
      },
      history: [...o.history, { status: o.status, at, note: `${again ? "Auftrag erneut gesendet" : "Partner zugeordnet, Auftrag gesendet"}: ${partner.name} (${to.join(", ")})${logOnly(result)}${floristNote ? ` – Hinweis an Floristik: „${floristNote}“` : ""}` }],
    }));
    revalidateOrder(id);
    return { ok: true, message: [...notes, `Auftrag ${again ? "erneut " : ""}an ${partner.name} gesendet (${to.join(", ")})${logOnly(result)}.`].join(" ") };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Senden fehlgeschlagen." };
  }
}

/** Sends the cancellation to the assigned partner by hand (e.g. when the order is changed by phone). */
export async function sendPartnerCancellationAction(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  try {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const { getOrderById } = await import("@/lib/cms");
    const found = await getOrderById(id);
    if (!found) return { ok: false, message: "Bestellung nicht gefunden." };
    const order = withEffectivePartner(found);
    if (!order.partner?.sentAt) return { ok: false, message: "Es wurde noch kein Auftrag an einen Partner gesendet." };
    const r = await cancelAtPartner(order, "cancelled");
    revalidateOrder(id);
    return r;
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Senden fehlgeschlagen." };
  }
}

/* ---------------- Unpaid orders & abandoned checkouts ---------------- */

/** "Unbezahlte jetzt bereinigen": the same run as the hourly cron (`/api/cron/stale-orders`). */
export async function expireStaleOrdersAction(): Promise<OrderActionState> {
  try {
    await requireAdmin();
    const r = await expireStaleOrders();
    const pruned = await pruneCheckoutDrafts().catch(() => 0);
    revalidatePath("/admin/bestellungen");
    revalidatePath("/admin");
    const parts = [
      `${r.expired.length} Bestellung(en) als abgebrochen markiert (Bestand freigegeben)`,
      ...(r.confirmed.length ? [`${r.confirmed.length} nachträglich als bezahlt bestätigt`] : []),
      ...(r.skipped.length ? [`${r.skipped.length} übersprungen (Zahlung läuft noch oder Stripe nicht erreichbar)`] : []),
      ...(pruned ? [`${pruned} abgebrochene Kasse(n) älter als 30 Tage gelöscht`] : []),
    ];
    return { ok: true, message: `${parts.join(", ")}.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Bereinigen fehlgeschlagen." };
  }
}

/** Deletes one "Abgebrochene Kasse" entry. */
export async function deleteCheckoutDraftAction(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  try {
    await requireAdmin();
    const removed = await deleteCheckoutDraft(String(formData.get("id") ?? ""));
    revalidatePath("/admin/bestellungen");
    return removed ? { ok: true, message: "Eintrag gelöscht." } : { ok: false, message: "Eintrag nicht gefunden." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Löschen fehlgeschlagen." };
  }
}

/** "12,5" / "12.50" → 12.5; empty → undefined; invalid → NaN. */
function parseBudget(v: FormDataEntryValue | null): number | undefined {
  const s = String(v ?? "").trim().replace(/\s|€/g, "").replace(",", ".");
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 10_000 ? Math.round(n * 100) / 100 : NaN;
}

/**
 * Partner budget per line (and extra) of one order – e.g. for individual offers, where nobody entered
 * one. Fields: `line-<i>` and `extra-<i>-<j>` (EUR, net). Empty = no budget.
 */
export async function saveLineBudgetsAction(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  try {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    let invalid = false;
    const read = (key: string) => {
      const n = parseBudget(formData.get(key));
      if (Number.isNaN(n)) invalid = true;
      return n;
    };
    const values = { lines: [] as (number | undefined)[], extras: [] as (number | undefined)[][] };
    let i = 0;
    while (formData.has(`line-${i}`)) {
      values.lines.push(read(`line-${i}`));
      const ex: (number | undefined)[] = [];
      let j = 0;
      while (formData.has(`extra-${i}-${j}`)) ex.push(read(`extra-${i}-${j++}`));
      values.extras.push(ex);
      i++;
    }
    if (invalid) return { ok: false, message: "Bitte nur Beträge zwischen 0 und 10.000 € eingeben." };
    const updated = await updateOrder(id, (o) => ({
      ...o,
      lines: o.lines.map((l, li) => li >= values.lines.length ? l : {
        ...l,
        floristBudget: values.lines[li],
        extras: l.extras.map((e, ei) => ({ ...e, floristBudget: values.extras[li]?.[ei] })),
      }),
    }));
    if (!updated) return { ok: false, message: "Bestellung nicht gefunden." };
    revalidateOrder(id);
    const sent = updated.partner?.sentAt && !updated.partner.cancelSentAt;
    return { ok: true, message: sent ? "Budget gespeichert. Der Auftrag ging schon an den Partner – „Auftrag erneut senden“, damit er das neue Budget sieht." : "Budget gespeichert – es steht im Auftrag an den Partner." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Fehler beim Speichern." };
  }
}
