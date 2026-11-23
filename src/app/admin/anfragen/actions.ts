"use server";

import { revalidatePath } from "next/cache";
import type { CustomRequestStatus } from "@/types";
import { requireAdmin } from "@/lib/admin-session";
import { updateContactMessage, updateCustomRequest } from "@/lib/cms";
import { CUSTOM_REQUEST_LIMITS, CUSTOM_REQUEST_STATUSES, STATUS_LABELS } from "@/lib/custom-requests-core";

export type RequestActionResult = { ok: boolean; message: string };

/** Status and internal note of a request (AF-…) or a contact message (CM-…). */
export async function saveRequestAction(id: string, input: { status: string; note: string }): Promise<RequestActionResult> {
  try {
    await requireAdmin();
    if (!(CUSTOM_REQUEST_STATUSES as readonly string[]).includes(input.status)) return { ok: false, message: "Unbekannter Status." };
    const status = input.status as CustomRequestStatus;
    const note = typeof input.note === "string" ? input.note.trim().slice(0, CUSTOM_REQUEST_LIMITS.note) : "";
    const at = new Date().toISOString();
    let found: unknown;
    if (id.startsWith("AF-")) {
      found = await updateCustomRequest(id, (r) => ({
        ...r,
        status,
        note: note || undefined,
        updatedAt: at,
        history: r.status !== status ? [...(r.history ?? []), { at, note: `Status: ${STATUS_LABELS[status]}` }] : r.history ?? [],
      }));
    } else {
      found = await updateContactMessage(id, (m) => ({ ...m, status, note: note || undefined, read: status !== "new" }));
    }
    if (!found) return { ok: false, message: "Anfrage nicht gefunden." };
    revalidatePath("/admin/anfragen");
    revalidatePath(`/admin/anfragen/${id}`);
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Gespeichert." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }
}
