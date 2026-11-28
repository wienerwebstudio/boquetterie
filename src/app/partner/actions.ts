"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getOrderById } from "@/lib/cms";
import { rateLimit } from "@/lib/rate-limit";
import { getPartnerSession } from "@/lib/partner-auth";
import { confirmOrderForPartner } from "@/lib/partner-portal";

export type PortalConfirmState = { ok: boolean; message: string } | null;

/**
 * "Bestätigen" in the Partner-Portal – same effect as the "Auftrag bestätigen" link of
 * the order slip. Only the logged-in partner's own, paid, not cancelled orders.
 */
export async function confirmFromPortal(_prev: PortalConfirmState, formData: FormData): Promise<PortalConfirmState> {
  const h = await headers();
  const ip = h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",").pop()?.trim() ?? "anonymous";
  if (!rateLimit(ip, { scope: "partner-portal-confirm", limit: 30, windowMs: 10 * 60_000 }).ok) {
    return { ok: false, message: "Zu viele Versuche. Bitte in ein paar Minuten noch einmal." };
  }
  const session = await getPartnerSession();
  if (!session) return { ok: false, message: "Bitte neu anmelden." };
  const id = String(formData.get("order") ?? "").trim().toUpperCase();
  const order = /^[A-Z0-9-]{3,40}$/.test(id) ? await getOrderById(id) : null;
  // Same answer for "does not exist" and "belongs to someone else".
  if (!order) return { ok: false, message: "Dieser Auftrag ist nicht (mehr) für euch bestimmt." };
  const r = await confirmOrderForPartner(order, { partnerId: session.partner.id }, "Partner-Portal");
  if (!r.ok) {
    return { ok: false, message: r.reason === "cancelled" ? "Dieser Auftrag wurde storniert – bitte nicht binden." : "Dieser Auftrag ist nicht (mehr) für euch bestimmt." };
  }
  revalidatePath("/partner");
  revalidatePath(`/admin/bestellungen/${order.id}`);
  revalidatePath("/admin/bestellungen");
  return { ok: true, message: r.already ? "War bereits bestätigt." : "Danke – bestätigt." };
}
