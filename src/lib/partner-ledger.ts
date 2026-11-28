import type { Order, OrderLine } from "@/types";
import type { PartnerLedgerEntry, PartnerPortalSettings } from "@/types/partner-portal";
import { effectivePartner } from "@/lib/partners";
import { floristSize } from "@/lib/mail/templates";
import { euro, toCsv, viennaDateTime } from "@/lib/orders-export";

/**
 * Partner-Portal accounting (pure – unit tested in tests/unit/partner-ledger.test.ts).
 *
 * Rules (owner-approved, see docs/PARTNER-PORTAL.md):
 *  - Amount of an order = net florist budget of its lines + extras (no VAT). The budget
 *    snapshot stored on the order wins; for older orders without it the CURRENT budget
 *    list is used (same lookup as the order slip). A part without any budget counts 0
 *    and flags the order "Betrag fehlt" (admin only).
 *  - An order is OWED once the partner confirmed it (`partner.confirmedAt`) – it stays owed
 *    when it is cancelled later. Migration: an order delivered before the portal launch
 *    without a confirmation counts as confirmed (the data is not rewritten).
 *  - Only paid orders count (a confirmed order that was refunded later stays owed – the
 *    partner had already bound it), and only orders created strictly after the partner's
 *    "Abrechnung ab" order.
 *  - open = owed + corrections − payments. "bezahlt" badges: FIFO – the net credit
 *    (payments − corrections) settles the oldest owed orders first.
 */

/** Orders delivered before this moment without a confirmation count as confirmed (portal launch). */
export const PORTAL_LAUNCH = "2026-11-23T00:00:00.000Z";

/** Statuses after which an order is no longer "Anstehend". */
const DONE_STATUSES = new Set<Order["status"]>(["delivered", "undeliverable", "cancelled"]);

/** Florist budgets as the ledger needs them (same shape as src/lib/florist-budget.ts). */
export interface BudgetLookup {
  products: Record<string, Record<string, number>>;
  extras: Record<string, number>;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface OrderAmount {
  /** EUR net; parts without a budget count 0. */
  amount: number;
  /** True when at least one line or extra has no budget at all ("Betrag fehlt"). */
  missing: boolean;
  /** True when at least one part was taken from the current budget list instead of the order's snapshot. */
  computed: boolean;
}

function lineAmount(l: OrderLine, budgets: BudgetLookup | null) {
  let amount = 0;
  let missing = false;
  let computed = false;
  const unit = l.floristBudget ?? (l.custom ? undefined : budgets?.products[l.productId]?.[l.sizeId]);
  if (l.floristBudget === undefined && unit !== undefined) computed = true;
  if (unit === undefined) missing = true;
  else amount += unit * l.quantity;
  for (const e of l.extras) {
    const u = e.floristBudget ?? budgets?.extras[e.extraId];
    if (e.floristBudget === undefined && u !== undefined) computed = true;
    if (u === undefined) missing = true;
    else amount += u * e.quantity;
  }
  return { amount, missing, computed };
}

/** Net florist amount of one order (see the rules above). */
export function orderPartnerAmount(order: Pick<Order, "lines">, budgets: BudgetLookup | null): OrderAmount {
  let amount = 0;
  let missing = order.lines.length === 0;
  let computed = false;
  for (const l of order.lines) {
    const r = lineAmount(l, budgets);
    amount += r.amount;
    missing ||= r.missing;
    computed ||= r.computed;
  }
  return { amount: r2(amount), missing, computed };
}

/** Paid in the sense of the ledger (see the rules above). */
export function countsAsPaid(order: Order): boolean {
  if (order.payment.status === "paid") return true;
  return order.payment.status === "refunded" && Boolean(order.payment.paidAt) && Boolean(effectivePartner(order)?.confirmedAt);
}

/**
 * Access rule of the portal: the order belongs to this partner and is paid. Unpaid
 * orders and orders of other partners are never shown to (or confirmable by) a partner.
 */
export function partnerCanAccessOrder(order: Order, partnerId: string): boolean {
  if (!partnerId) return false;
  return effectivePartner(order)?.id === partnerId && countsAsPaid(order);
}

/** Can the partner confirm this order in the portal right now? */
export function partnerCanConfirm(order: Order, partnerId: string): boolean {
  const p = order.partner;
  return Boolean(
    p && p.id === partnerId && !p.confirmedAt && !p.cancelSentAt &&
    order.payment.status === "paid" && order.status !== "cancelled",
  );
}

/** When the order was set to "delivered" (history), else noon of the delivery day. */
export function deliveredAt(order: Order): string {
  const h = [...order.history].reverse().find((e) => e.status === "delivered");
  return h?.at ?? `${order.delivery.date}T12:00:00.000Z`;
}

export type OwedReason = "confirmed" | "legacy";

/** Why the order is owed to its partner – or null when it is not (yet). */
export function owedReason(order: Order, launch = PORTAL_LAUNCH): OwedReason | null {
  if (effectivePartner(order)?.confirmedAt) return "confirmed";
  if (order.status === "delivered" && deliveredAt(order) < launch) return "legacy";
  return null;
}

/** Created strictly after the "Abrechnung ab" order (no setting = everything counts). */
export function inBillingPeriod(order: Pick<Order, "createdAt">, billingFrom: PartnerPortalSettings["billingFrom"]): boolean {
  return !billingFrom || order.createdAt > billingFrom.createdAt;
}

export function isUpcoming(order: Order): boolean {
  return !DONE_STATUSES.has(order.status) && !effectivePartner(order)?.cancelSentAt;
}

export interface LedgerItem {
  order: Order;
  amount: number;
  missing: boolean;
  computed: boolean;
  owed: OwedReason | null;
  inPeriod: boolean;
  upcoming: boolean;
  /** FIFO: settled by the payments so far (only meaningful for owed items). */
  paid: boolean;
}

export interface PartnerLedger {
  partnerId: string;
  /** Owed orders in the billing period, oldest first (delivery day, then creation). */
  owed: LedgerItem[];
  /** Assigned, paid, not delivered/cancelled – soonest first. Independent of the cutoff. */
  upcoming: LedgerItem[];
  /** Owed orders that are no longer upcoming, newest first. */
  done: LedgerItem[];
  /** `done` grouped by delivery month ("YYYY-MM"), newest first. */
  months: { month: string; count: number; total: number; items: LedgerItem[] }[];
  /** Delivered after the launch, in the period, but never confirmed – not owed (admin hint). */
  unconfirmedDelivered: LedgerItem[];
  owedTotal: number;
  paymentsTotal: number;
  correctionsTotal: number;
  open: number;
  /** Owed orders whose amount is (partly) unknown. */
  missingCount: number;
  payments: PartnerLedgerEntry[];
  corrections: PartnerLedgerEntry[];
}

const byDeliveryAsc = (a: LedgerItem, b: LedgerItem) =>
  a.order.delivery.date.localeCompare(b.order.delivery.date) ||
  (a.order.delivery.windowFrom ?? "").localeCompare(b.order.delivery.windowFrom ?? "") ||
  a.order.createdAt.localeCompare(b.order.createdAt);

export function buildPartnerLedger(input: {
  orders: Order[];
  partnerId: string;
  budgets: BudgetLookup | null;
  entries: PartnerLedgerEntry[];
  settings?: PartnerPortalSettings;
  launch?: string;
}): PartnerLedger {
  const { partnerId, budgets, settings } = input;
  const launch = input.launch ?? PORTAL_LAUNCH;
  const items: LedgerItem[] = input.orders
    .filter((o) => partnerCanAccessOrder(o, partnerId))
    .map((order) => {
      const a = orderPartnerAmount(order, budgets);
      return {
        order, ...a,
        owed: owedReason(order, launch),
        inPeriod: inBillingPeriod(order, settings?.billingFrom),
        upcoming: isUpcoming(order),
        paid: false,
      };
    });

  const owed = items.filter((i) => i.owed && i.inPeriod).sort(byDeliveryAsc);
  const mine = input.entries.filter((e) => e.partnerId === partnerId);
  const payments = mine.filter((e) => e.kind === "payment").sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const corrections = mine.filter((e) => e.kind === "correction").sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const owedTotal = r2(owed.reduce((s, i) => s + i.amount, 0));
  const paymentsTotal = r2(payments.reduce((s, e) => s + e.amount, 0));
  const correctionsTotal = r2(corrections.reduce((s, e) => s + e.amount, 0));
  const open = r2(owedTotal + correctionsTotal - paymentsTotal);

  // FIFO: the net credit settles the oldest owed orders first.
  let credit = r2(paymentsTotal - correctionsTotal);
  for (const item of owed) {
    if (credit + 0.005 >= item.amount) {
      item.paid = true;
      credit = r2(credit - item.amount);
    } else {
      break;
    }
  }

  const done = owed.filter((i) => !i.upcoming).reverse();
  const groups = new Map<string, LedgerItem[]>();
  for (const i of done) {
    const m = i.order.delivery.date.slice(0, 7);
    groups.set(m, [...(groups.get(m) ?? []), i]);
  }
  const months = [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, list]) => ({ month, count: list.length, total: r2(list.reduce((s, i) => s + i.amount, 0)), items: list }));

  return {
    partnerId,
    owed,
    upcoming: items.filter((i) => i.upcoming).sort(byDeliveryAsc),
    done,
    months,
    unconfirmedDelivered: items.filter((i) => !i.owed && i.inPeriod && i.order.status === "delivered").sort(byDeliveryAsc),
    owedTotal,
    paymentsTotal,
    correctionsTotal,
    open,
    missingCount: owed.filter((i) => i.missing).length,
    payments,
    corrections,
  };
}

const MONTHS = ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/** "2026-11" → "November" (same year as `currentYear`) or "November 2026". */
export function monthLabel(month: string, currentYear?: number): string {
  const [y, m] = month.split("-").map(Number);
  const name = MONTHS[(m || 1) - 1] ?? month;
  return currentYear === y ? name : `${name} ${y}`;
}

/* ---------------- What a partner may see ---------------- */

export interface PartnerOrderView {
  id: string;
  deliveryDate: string;
  windowLabel?: string;
  /** Planned courier pickup (ISO), when booked. */
  pickupAt?: string;
  lines: { name: string; size: string; color?: string; quantity: number; description?: string; floristNote?: string; extras: { name: string; quantity: number }[] }[];
  card?: { text: string; sender?: string; anonymous: boolean };
  /** Team note to the florist (shown bold). */
  teamNote?: string;
  /** Recipient: first name + PLZ / area only – the courier delivers. */
  recipient: { firstName: string; zip: string; area: string };
  amount: number;
  confirmed: boolean;
  canConfirm: boolean;
  cancelled: boolean;
  paid: boolean;
}

/**
 * The partner-safe projection of a ledger item: no sale prices or totals, nothing
 * about the orderer, no recipient address/phone, no internal fields or tokens.
 */
export function toPartnerView(item: LedgerItem, partnerId: string): PartnerOrderView {
  const o = item.order;
  const p = effectivePartner(o);
  const card = o.lines.find((l) => l.message || l.senderName || l.anonymous);
  return {
    id: o.id,
    deliveryDate: o.delivery.date,
    windowLabel: o.delivery.windowLabel,
    pickupAt: o.courier?.pickupAt,
    lines: o.lines.map((l) => ({
      name: l.productName,
      size: floristSize(l),
      color: l.color,
      quantity: l.quantity,
      description: l.description,
      floristNote: l.floristNote,
      extras: l.extras.map((e) => ({ name: e.name, quantity: e.quantity })),
    })),
    card: card ? { text: card.message ?? "", sender: card.anonymous ? undefined : card.senderName, anonymous: Boolean(card.anonymous) } : undefined,
    teamNote: p?.note?.trim() || undefined,
    recipient: { firstName: o.recipient.firstName, zip: o.recipient.zip, area: o.delivery.zoneName },
    amount: item.amount,
    confirmed: Boolean(item.owed),
    canConfirm: partnerCanConfirm(o, partnerId),
    cancelled: o.status === "cancelled" || Boolean(p?.cancelSentAt),
    paid: item.paid,
  };
}

/* ---------------- CSV (admin export per partner and month) ---------------- */

/** Delivery months ("YYYY-MM") of the owed orders, newest first. */
export function ledgerMonths(ledger: Pick<PartnerLedger, "owed">): string[] {
  return [...new Set(ledger.owed.map((i) => i.order.delivery.date.slice(0, 7)))].sort().reverse();
}

/**
 * Owed orders of one delivery month as Excel (de-AT) CSV: semicolon, UTF-8 BOM, decimal
 * comma. Internal (admin) – no customer data, but the "Betrag fehlt" flag.
 */
export function partnerMonthCsv(ledger: PartnerLedger, month: string, partnerName: string): string {
  return partnerCsv([{ ledger, partnerName }], { month });
}

/** What a partner export contains: one delivery month (else all) and optionally only the still open (unpaid, FIFO) orders. */
export interface PartnerExportScope { month?: string; open?: boolean }

/**
 * Owed orders of one or more partners as Excel (de-AT) CSV: semicolon, UTF-8 BOM, decimal comma.
 * Internal (admin) – no customer data, but the "Betrag fehlt" flag. A sum per partner, and a
 * grand total when several partners are exported.
 */
export function partnerCsv(list: { ledger: PartnerLedger; partnerName: string }[], scope: PartnerExportScope): string {
  const header = ["Partner", "Bestellnummer", "Bestellt", "Liefertag", "Zeitfenster", "Strauß", "Extras", "Betrag netto", "Betrag fehlt", "Aus aktueller Budgetliste", "Bestätigt", "Status", "Bezahlt (FIFO)"];
  const rows: string[][] = [header];
  let grandCount = 0;
  let grand = 0;
  for (const { ledger, partnerName } of list) {
    const items = ledger.owed.filter((i) => (!scope.month || i.order.delivery.date.startsWith(scope.month)) && (!scope.open || !i.paid));
    if (!items.length && list.length > 1) continue;
    for (const i of items) {
      const o = i.order;
      rows.push([
        partnerName, o.id, viennaDateTime(o.createdAt), o.delivery.date, o.delivery.windowLabel ?? "",
        o.lines.map((l) => `${l.quantity} × ${l.productName}${l.custom ? "" : ` (${floristSize(l)}${l.color ? `, ${l.color}` : ""})`}`).join(" | "),
        o.lines.flatMap((l) => l.extras.map((e) => `${e.quantity} × ${e.name}`)).join(", "),
        euro(i.amount), i.missing ? "ja" : "", i.computed ? "ja" : "",
        i.owed === "legacy" ? "geliefert vor Portal-Start" : viennaDateTime(effectivePartner(o)?.confirmedAt),
        o.status, i.paid ? "bezahlt" : "offen",
      ]);
    }
    const total = r2(items.reduce((sum, i) => sum + i.amount, 0));
    grandCount += items.length;
    grand = r2(grand + total);
    rows.push([], [list.length > 1 ? `Summe ${partnerName}` : "Summe", `${items.length} Aufträge`, "", "", "", "", "", euro(total)]);
    if (list.length > 1) rows.push([]);
  }
  if (list.length > 1) rows.push(["Gesamt", `${grandCount} Aufträge`, "", "", "", "", "", euro(grand)]);
  return toCsv(rows);
}
