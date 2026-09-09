"use server";

import { revalidatePath } from "next/cache";
import { getSettings, updateOrder } from "@/lib/cms";
import { requireAdmin } from "@/lib/admin-session";
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

    const updated = await updateOrder(id, (o) => ({
      ...o,
      status,
      history: [...o.history, { status, at: new Date().toISOString(), ...(note ? { note } : {}) }],
    }));
    if (!updated) return { ok: false, message: "Bestellung nicht gefunden." };
    revalidateOrder(id);
    return { ok: true, message: `Status auf „${def.label}“ gesetzt.` };
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
