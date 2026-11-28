import { describe, expect, it } from "vitest";
import type { Order, OrderLine } from "@/types";
import type { PartnerLedgerEntry } from "@/types/partner-portal";
import {
  buildPartnerLedger, countsAsPaid, inBillingPeriod, ledgerMonths, monthLabel, orderPartnerAmount, owedReason, partnerCanAccessOrder,
  partnerCanConfirm, partnerCsv, partnerMonthCsv, PORTAL_LAUNCH, toPartnerView,
} from "@/lib/partner-ledger";

const BUDGETS = { products: { "p-amour": { m: 30, l: 40 } }, extras: { "x-card": 2, "x-vase": 8 } };

function line(over: Partial<OrderLine> = {}): OrderLine {
  return { productId: "p-amour", productName: "Amour", sizeId: "l", sizeLabel: "Groß", quantity: 1, unitPrice: 79, image: "/x.jpg", extras: [], ...over };
}

let seq = 0;
function order(over: Partial<Order> & { partnerId?: string; confirmedAt?: string } = {}): Order {
  seq += 1;
  const { partnerId = "dody", confirmedAt, ...rest } = over;
  const createdAt = rest.createdAt ?? `2026-12-${String(seq % 28 + 1).padStart(2, "0")}T10:00:00.000Z`;
  return {
    id: `BQ-T${String(seq).padStart(5, "0")}`,
    token: "secret-token",
    createdAt,
    status: "paid",
    history: [{ status: "paid", at: createdAt }],
    recipient: { firstName: "Anna", lastName: "Empfängerin", street: "Gasse", houseNumber: "1", zip: "1040", city: "Wien", country: "AT", phone: "+43 660 1111" },
    delivery: { date: createdAt.slice(0, 10), windowLabel: "10–13 Uhr", windowFrom: "10:00", zoneId: "z", zoneName: "Wien Zentrum", fee: 0 },
    customer: { firstName: "Bernd", lastName: "Besteller", email: "bernd@example.com", phone: "+43 660 2222" },
    lines: [line({ floristBudget: 40 })],
    totals: { subtotal: 79, extras: 0, delivery: 0, discount: 0, total: 79 },
    payment: { method: "card", status: "paid", paidAt: createdAt },
    partner: partnerId ? { id: partnerId, name: partnerId, assignedAt: createdAt, sentAt: createdAt, confirmToken: "tok", ...(confirmedAt ? { confirmedAt } : {}) } : undefined,
    ...rest,
  } as Order;
}

const payment = (amount: number, date = "2026-12-20", partnerId = "dody"): PartnerLedgerEntry => ({ id: `e${amount}${date}`, partnerId, kind: "payment", amount, date, note: "", createdAt: `${date}T08:00:00.000Z` });
const correction = (amount: number, partnerId = "dody"): PartnerLedgerEntry => ({ id: `c${amount}`, partnerId, kind: "correction", amount, date: "2026-12-21", note: "Grund", createdAt: "2026-12-21T08:00:00.000Z" });

describe("amount per order", () => {
  it("uses the stored snapshot of lines and extras (net, × quantity)", () => {
    const o = order({ lines: [line({ quantity: 2, floristBudget: 35, extras: [{ extraId: "x-card", name: "Karte", quantity: 1, unitPrice: 4, floristBudget: 1.5 }] })] });
    expect(orderPartnerAmount(o, BUDGETS)).toEqual({ amount: 71.5, missing: false, computed: false });
  });
  it("falls back to the CURRENT budget list for older orders without snapshot", () => {
    const o = order({ lines: [line({ sizeId: "m", floristBudget: undefined, extras: [{ extraId: "x-vase", name: "Vase", quantity: 1, unitPrice: 15 }] })] });
    expect(orderPartnerAmount(o, BUDGETS)).toEqual({ amount: 38, missing: false, computed: true });
  });
  it("counts unknown parts as 0 and flags \"Betrag fehlt\"", () => {
    const o = order({ lines: [line({ productId: "p-neu", floristBudget: undefined, extras: [{ extraId: "x-card", name: "Karte", quantity: 2, unitPrice: 4 }] })] });
    expect(orderPartnerAmount(o, BUDGETS)).toEqual({ amount: 4, missing: true, computed: true });
    expect(orderPartnerAmount(order({ lines: [line({ custom: true, floristBudget: undefined })] }), BUDGETS).missing).toBe(true);
    expect(orderPartnerAmount(order({ lines: [line({ floristBudget: undefined })] }), null)).toEqual({ amount: 0, missing: true, computed: false });
  });
});

describe("owed, paid-only, cutoff", () => {
  it("is owed once confirmed – and stays owed when cancelled later", () => {
    expect(owedReason(order({ confirmedAt: "2026-12-02T09:00:00.000Z" }))).toBe("confirmed");
    expect(owedReason(order({ confirmedAt: "2026-12-02T09:00:00.000Z", status: "cancelled" }))).toBe("confirmed");
    expect(owedReason(order())).toBeNull();
  });
  it("counts orders delivered before the launch without confirmation as confirmed (legacy), later ones not", () => {
    const before = order({ status: "delivered", createdAt: "2026-11-19T10:00:00.000Z", history: [{ status: "delivered", at: "2026-11-20T15:00:00.000Z" }] });
    const after = order({ status: "delivered", createdAt: "2026-11-25T10:00:00.000Z", history: [{ status: "delivered", at: "2026-11-26T15:00:00.000Z" }] });
    expect(owedReason(before)).toBe("legacy");
    expect(owedReason(after)).toBeNull();
    expect(owedReason(before, "2026-11-01T00:00:00.000Z")).toBeNull();
    expect(PORTAL_LAUNCH > "2026-11-20").toBe(true);
  });
  it("only paid orders count; a confirmed order refunded later stays owed", () => {
    expect(countsAsPaid(order({ payment: { method: "card", status: "pending" } }))).toBe(false);
    expect(countsAsPaid(order({ payment: { method: "card", status: "refunded", paidAt: "2026-12-01T10:00:00.000Z" } }))).toBe(false);
    expect(countsAsPaid(order({ confirmedAt: "2026-12-01T11:00:00.000Z", payment: { method: "card", status: "refunded", paidAt: "2026-12-01T10:00:00.000Z" } }))).toBe(true);
  });
  it("\"Abrechnung ab\" is exclusive", () => {
    const from = { orderId: "BQ-EMRE", createdAt: "2026-12-05T10:00:00.000Z", setAt: "x" };
    expect(inBillingPeriod({ createdAt: "2026-12-05T10:00:00.000Z" }, from)).toBe(false);
    expect(inBillingPeriod({ createdAt: "2026-12-05T10:00:00.001Z" }, from)).toBe(true);
    expect(inBillingPeriod({ createdAt: "2020-01-01T00:00:00.000Z" }, undefined)).toBe(true);
  });
});

describe("ledger", () => {
  const c = (d: string) => `2026-12-${d}T09:00:00.000Z`;
  const o1 = order({ createdAt: c("01"), confirmedAt: c("01"), status: "delivered", lines: [line({ floristBudget: 30 })] });
  const o2 = order({ createdAt: c("02"), confirmedAt: c("02"), status: "delivered", lines: [line({ floristBudget: 40 })] });
  const o3 = order({ createdAt: c("03"), confirmedAt: c("03"), lines: [line({ floristBudget: 50 })] }); // confirmed, upcoming
  const pending = order({ createdAt: c("04"), lines: [line({ floristBudget: 60 })] }); // not confirmed
  const unpaid = order({ createdAt: c("05"), confirmedAt: c("05"), payment: { method: "card", status: "pending" } });
  const other = order({ createdAt: c("06"), confirmedAt: c("06"), partnerId: "rosen" });
  const beforeCutoff = order({ createdAt: "2026-11-30T09:00:00.000Z", confirmedAt: "2026-11-30T10:00:00.000Z", status: "delivered" });
  const orders = [o1, o2, o3, pending, unpaid, other, beforeCutoff];
  const settings = { billingFrom: { orderId: "BQ-X", createdAt: "2026-11-30T09:00:00.000Z", setAt: "x" } };

  it("owed = confirmed, paid, own, after the cutoff; open = owed + corrections − payments", () => {
    const l = buildPartnerLedger({ orders, partnerId: "dody", budgets: BUDGETS, entries: [payment(30), correction(-5), correction(12), payment(99, "2026-12-20", "rosen")], settings });
    expect(l.owed.map((i) => i.order.id)).toEqual([o1.id, o2.id, o3.id]);
    expect(l.owedTotal).toBe(120);
    expect(l.paymentsTotal).toBe(30);
    expect(l.correctionsTotal).toBe(7);
    expect(l.open).toBe(97);
    expect(l.upcoming.map((i) => i.order.id)).toEqual([o3.id, pending.id]);
    expect(l.done.map((i) => i.order.id)).toEqual([o2.id, o1.id]);
    expect(l.months).toEqual([expect.objectContaining({ month: "2026-12", count: 2, total: 70 })]);
  });

  it("FIFO: payments settle the oldest owed orders first", () => {
    const badges = (entries: PartnerLedgerEntry[]) => buildPartnerLedger({ orders, partnerId: "dody", budgets: BUDGETS, entries, settings }).owed.map((i) => i.paid);
    expect(badges([])).toEqual([false, false, false]);
    expect(badges([payment(30)])).toEqual([true, false, false]);
    expect(badges([payment(69.99)])).toEqual([true, false, false]);
    expect(badges([payment(50), payment(20)])).toEqual([true, true, false]);
    expect(badges([payment(120)])).toEqual([true, true, true]);
    // A negative correction (deduction from the debt) works like a payment, a positive one consumes credit.
    expect(badges([payment(30), correction(-40)])).toEqual([true, true, false]);
    expect(badges([payment(70), correction(10)])).toEqual([true, false, false]);
  });

  it("access control: partner A never sees or confirms B's orders; unpaid ones are invisible", () => {
    expect(partnerCanAccessOrder(other, "dody")).toBe(false);
    expect(partnerCanAccessOrder(other, "rosen")).toBe(true);
    expect(partnerCanAccessOrder(unpaid, "dody")).toBe(false);
    expect(partnerCanAccessOrder(o1, "")).toBe(false);
    expect(partnerCanConfirm(pending, "dody")).toBe(true);
    expect(partnerCanConfirm(pending, "rosen")).toBe(false);
    expect(partnerCanConfirm(o1, "dody")).toBe(false); // already confirmed
    expect(partnerCanConfirm(order({ status: "cancelled" }), "dody")).toBe(false);
    expect(partnerCanConfirm(order({ payment: { method: "card", status: "failed" } }), "dody")).toBe(false);
    const l = buildPartnerLedger({ orders, partnerId: "rosen", budgets: BUDGETS, entries: [], settings: undefined });
    expect(l.owed.map((i) => i.order.id)).toEqual([other.id]);
  });

  it("partner view carries no sale prices, no orderer data and no recipient address", () => {
    const l = buildPartnerLedger({ orders, partnerId: "dody", budgets: BUDGETS, entries: [], settings });
    const v = toPartnerView(l.upcoming[1], "dody");
    expect(v).toMatchObject({ id: pending.id, amount: 60, confirmed: false, canConfirm: true, recipient: { firstName: "Anna", zip: "1040", area: "Wien Zentrum" } });
    const json = JSON.stringify(v);
    for (const secret of ["Bernd", "Besteller", "bernd@example.com", "+43 660", "Gasse", "Empfängerin", "secret-token", "confirmToken", "unitPrice", "totals"]) expect(json).not.toContain(secret);
  });

  it("CSV per month: Excel de-AT (BOM, semicolon, decimal comma) with the missing flag", () => {
    const missing = order({ createdAt: c("07"), confirmedAt: c("07"), status: "delivered", lines: [line({ productId: "p-neu", floristBudget: undefined })] });
    const l = buildPartnerLedger({ orders: [...orders, missing], partnerId: "dody", budgets: BUDGETS, entries: [payment(30)], settings });
    expect(ledgerMonths(l)).toEqual(["2026-12"]);
    const csv = partnerMonthCsv(l, "2026-12", "Blumen Dody");
    expect(csv.startsWith("﻿Partner;Bestellnummer;")).toBe(true);
    expect(csv).toContain(`Blumen Dody;${o1.id};`);
    expect(csv).toContain(";30,00;;;");
    expect(csv).toMatch(new RegExp(`${missing.id};.*;0,00;ja;`));
    expect(csv).toContain("Summe;4 Aufträge;;;;;;120,00");
    expect(csv).not.toContain("bernd@example.com");
  });

  it("CSV for several partners and only open orders", () => {
    const dody = buildPartnerLedger({ orders, partnerId: "dody", budgets: BUDGETS, entries: [payment(30)], settings });
    const rosen = buildPartnerLedger({ orders, partnerId: "rosen", budgets: BUDGETS, entries: [], settings: undefined });
    const all = partnerCsv([{ ledger: dody, partnerName: "Blumen Dody" }, { ledger: rosen, partnerName: "Rosen" }], {});
    expect(all).toContain("Summe Blumen Dody;");
    expect(all).toContain("Summe Rosen;1 Aufträge");
    expect(all).toMatch(/Gesamt;\d+ Aufträge/);
    const open = partnerCsv([{ ledger: dody, partnerName: "Blumen Dody" }], { open: true });
    expect(open).not.toContain(";bezahlt\r\n");
    expect(open.split("\r\n").filter((r) => r.includes(";offen")).length).toBe(dody.owed.filter((i) => !i.paid).length);
  });

  it("month labels", () => {
    expect(monthLabel("2026-11", 2026)).toBe("November");
    expect(monthLabel("2026-01", 2027)).toBe("Jänner 2026");
  });
});

describe("portal wiring", () => {
  it("the order slip links to the portal; /partner is never language-prefixed", async () => {
    const { floristOrder } = await import("@/lib/mail/templates");
    const mail = floristOrder({ order: order(), brand: { name: "Blumora", siteUrl: "https://blumora.at" }, portalUrl: "https://blumora.at/partner" });
    expect(mail.html).toContain("Alle Aufträge im Partner-Portal ansehen");
    expect(mail.html).toContain('href="https://blumora.at/partner"');
    const { resolvePublicPath, localizePath } = await import("@/i18n/paths");
    expect(resolvePublicPath("/partner")).toBeNull();
    expect(resolvePublicPath("/partner/anmelden")).toBeNull();
    expect(resolvePublicPath("/partner-auftrag")).not.toBeNull();
    expect(localizePath("en", "/partner")).toBe("/partner");
  });
});
