"use server";

import { revalidatePath } from "next/cache";
import { getSettings, updateOrder } from "@/lib/cms";
import { requireAdmin } from "@/lib/admin-session";
import { ORDER_MAIL_LABELS, sendOrderMails, sendOrderStatusUpdate, type OrderMailKind } from "@/lib/mail";
import { attachFloristBudgets, getFloristBudgets } from "@/lib/florist-budget";
import { releaseStock } from "@/lib/orders";
import { bookCourier, cancelCourier } from "@/lib/courier";
import { sendManualReviewRequest } from "@/lib/mail/review-requests";
import { formatDateTime } from "@/lib/format";
import type { Order, OrderStatus } from "@/types";

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
    return { ok: true, message: `Status auf „${def.label}“ gesetzt.${mailNote}${courierNote}${reviewNote}` };
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
 * MAIL_ADMIN, MAIL_FLORIST). For when a mail never arrived. Logged in the history.
 */
export async function resendOrderMailsAction(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  try {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const which = String(formData.get("which") ?? "");
    const kinds: OrderMailKind[] | null =
      which === "all" ? ["partner", "customer", "internal"] : which === "partner" || which === "customer" || which === "internal" ? [which] : null;
    if (!kinds) return { ok: false, message: "Bitte auswählen, welche Mail gesendet werden soll." };

    const { getOrderById } = await import("@/lib/cms");
    let order = await getOrderById(id);
    if (!order) return { ok: false, message: "Bestellung nicht gefunden." };
    if (order.payment.status !== "paid") return { ok: false, message: "Die Bestellung ist nicht bezahlt – es werden keine Mails gesendet." };

    // Orders from before the budget list carry no budget yet: fill it in, so the
    // florist's slip shows "Max. Budget" (and keep it on the order from now on).
    if (kinds.includes("partner") && order.lines.every((l) => l.floristBudget === undefined)) {
      const budgets = await getFloristBudgets();
      order = (await updateOrder(id, (o) => ({ ...o, lines: attachFloristBudgets(o.lines, budgets) }))) ?? order;
    }

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
