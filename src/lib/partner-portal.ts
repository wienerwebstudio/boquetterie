import "server-only";
import { getOrders, getPartnerLedgerEntries, getPartnerPortalSettings, updateOrder } from "@/lib/cms";
import { EMPTY_BUDGETS, getFloristBudgets } from "@/lib/florist-budget";
import { sendPartnerConfirmedNotice } from "@/lib/mail";
import { buildPartnerLedger, partnerCanConfirm, type PartnerLedger } from "@/lib/partner-ledger";
import type { Order } from "@/types";

/**
 * Server side of the Partner-Portal: loads a partner's ledger and confirms orders.
 * The accounting rules themselves are pure (src/lib/partner-ledger.ts).
 */

export async function loadPartnerLedger(partnerId: string): Promise<PartnerLedger> {
  const [orders, budgets, entries, settings] = await Promise.all([
    getOrders(),
    getFloristBudgets().catch(() => EMPTY_BUDGETS),
    getPartnerLedgerEntries(),
    getPartnerPortalSettings(),
  ]);
  return buildPartnerLedger({ orders, partnerId, budgets, entries, settings: settings[partnerId] });
}

export type PartnerConfirmResult =
  | { ok: true; already: boolean; order: Order }
  | { ok: false; reason: "invalid" | "cancelled" };

/**
 * Marks the order slip as confirmed by its partner: `partner.confirmedAt` + a history
 * note, then tells the team (MAIL_ADMIN). Used by the "Auftrag bestätigen" link of the
 * order slip (`confirmToken`) and by the portal button (`partnerId` of the session).
 * The check is repeated inside the write, so a slip re-sent or re-assigned in between
 * is never confirmed by mistake.
 */
export async function confirmOrderForPartner(order: Order, match: { confirmToken: string } | { partnerId: string }, via?: string): Promise<PartnerConfirmResult> {
  const p = order.partner;
  if (!p) return { ok: false, reason: "invalid" };
  if ("partnerId" in match && (p.id !== match.partnerId || order.payment.status !== "paid")) return { ok: false, reason: "invalid" };
  if ("confirmToken" in match && p.confirmToken !== match.confirmToken) return { ok: false, reason: "invalid" };
  if (p.cancelSentAt || order.status === "cancelled") return { ok: false, reason: "cancelled" };
  if (p.confirmedAt) return { ok: true, already: true, order };
  if ("partnerId" in match && !partnerCanConfirm(order, match.partnerId)) return { ok: false, reason: "invalid" };

  const ok = (o: Order) =>
    Boolean(o.partner && !o.partner.confirmedAt && !o.partner.cancelSentAt && o.status !== "cancelled" &&
      ("confirmToken" in match ? o.partner.confirmToken === match.confirmToken : partnerCanConfirm(o, match.partnerId)));
  const at = new Date().toISOString();
  const updated = await updateOrder(order.id, (o) =>
    ok(o) && o.partner
      ? { ...o, partner: { ...o.partner, confirmedAt: at }, history: [...o.history, { status: o.status, at, note: `Auftrag von ${o.partner.name} bestätigt${via ? ` (${via})` : ""}` }] }
      : o,
  );
  if (!updated?.partner?.confirmedAt || updated.partner.confirmedAt !== at) return { ok: false, reason: "invalid" };
  await sendPartnerConfirmedNotice(updated, updated.partner.name);
  return { ok: true, already: false, order: updated };
}
