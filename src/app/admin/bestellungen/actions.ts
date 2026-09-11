"use server";

import { revalidatePath } from "next/cache";
import { getSettings, updateOrder } from "@/lib/cms";
import { requireAdmin } from "@/lib/admin-session";
import { sendOrderStatusUpdate } from "@/lib/mail";
import { releaseStock } from "@/lib/orders";
import type { OrderStatus } from "@/types";

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
    return { ok: true, message: `Status auf „${def.label}“ gesetzt.${mailNote}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Fehler beim Speichern." };
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
