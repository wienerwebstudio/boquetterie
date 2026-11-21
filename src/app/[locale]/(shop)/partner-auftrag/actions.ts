"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getOrderById, updateOrder } from "@/lib/cms";
import { tokenMatches } from "@/lib/mail/reminders";
import { sendPartnerConfirmedNotice } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";

export type ConfirmState = { ok: boolean; message: string } | null;

/** "Auftrag bestätigen" from the partner's order slip. Only the current slip's token counts. */
export async function confirmPartnerOrder(_prev: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const h = await headers();
  const ip = h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",").pop()?.trim() ?? "anonymous";
  if (!rateLimit(ip, { scope: "partner-confirm", limit: 20, windowMs: 10 * 60_000 }).ok) {
    return { ok: false, message: "Zu viele Versuche. Bitte in ein paar Minuten noch einmal." };
  }
  const id = String(formData.get("order") ?? "").trim().toUpperCase();
  const token = String(formData.get("token") ?? "");
  const order = id ? await getOrderById(id) : null;
  const p = order?.partner;
  if (!order || !p?.confirmToken || !tokenMatches(p.confirmToken, token)) return { ok: false, message: "Der Link ist nicht mehr gültig." };
  if (p.cancelSentAt || order.status === "cancelled") return { ok: false, message: "Dieser Auftrag wurde storniert – bitte nicht binden." };
  if (p.confirmedAt) return { ok: true, message: "Danke – der Auftrag war bereits bestätigt." };

  const at = new Date().toISOString();
  const updated = await updateOrder(order.id, (o) =>
    o.partner && o.partner.confirmToken === p.confirmToken
      ? { ...o, partner: { ...o.partner, confirmedAt: at }, history: [...o.history, { status: o.status, at, note: `Auftrag von ${o.partner.name} bestätigt` }] }
      : o,
  );
  if (!updated?.partner?.confirmedAt) return { ok: false, message: "Der Link ist nicht mehr gültig." };
  await sendPartnerConfirmedNotice(updated, updated.partner.name);
  revalidatePath(`/admin/bestellungen/${order.id}`);
  revalidatePath("/admin/bestellungen");
  return { ok: true, message: "Danke – der Auftrag ist bestätigt. Blumora weiß jetzt, dass ihr ihn übernehmt." };
}
