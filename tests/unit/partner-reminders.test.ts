import { describe, expect, it } from "vitest";
import type { Order } from "@/types";
import { addOpenMinutes, isPartnerOpen, MAX_PARTNER_REMINDERS, nextPartnerReminderAt } from "@/lib/partner-reminders";

const dody = { openFrom: "07:30", openTo: "19:30", openDays: [0, 1, 2, 3, 4, 5, 6] };
// November = CET (UTC+1): 00:00 Vienna = 23:00Z the day before.
const vienna = (local: string) => new Date(new Date(`${local}:00Z`).getTime() - 60 * 60_000);
const iso = (local: string) => vienna(local).toISOString();

describe("open minutes", () => {
  it("counts only opening hours", () => {
    expect(isPartnerOpen(dody, vienna("2026-11-18T07:29"))).toBe(false);
    expect(isPartnerOpen(dody, vienna("2026-11-18T07:30"))).toBe(true);
    expect(isPartnerOpen(dody, vienna("2026-11-18T19:30"))).toBe(false);
  });
  it("order at midnight → first reminder 08:00, not during the night", () => {
    expect(addOpenMinutes(vienna("2026-11-18T00:00"), 30, dody).toISOString()).toBe(iso("2026-11-18T08:00"));
  });
  it("order during the day → 30 minutes later", () => {
    expect(addOpenMinutes(vienna("2026-11-18T10:00"), 30, dody).toISOString()).toBe(iso("2026-11-18T10:30"));
  });
  it("order 19:20 → 10 minutes today, 20 tomorrow morning", () => {
    expect(addOpenMinutes(vienna("2026-11-18T19:20"), 30, dody).toISOString()).toBe(iso("2026-11-19T07:50"));
  });
  it("closed weekday is skipped", () => {
    // 2026-11-22 is a Sunday.
    const noSunday = { ...dody, openDays: [1, 2, 3, 4, 5, 6] };
    expect(addOpenMinutes(vienna("2026-11-21T19:20"), 30, noSunday).toISOString()).toBe(iso("2026-11-23T07:50"));
  });
});

describe("next reminder", () => {
  const order = (partner: Partial<NonNullable<Order["partner"]>>) => ({
    status: "paid", payment: { status: "paid" }, delivery: { date: "2026-11-19" },
    partner: { id: "blumen-dody", name: "Blumen Dody", assignedAt: iso("2026-11-18T10:00"), sentAt: iso("2026-11-18T10:00"), confirmToken: "t", ...partner },
  }) as unknown as Order;

  it("30 open minutes after the slip, then after the last reminder", () => {
    expect(nextPartnerReminderAt(order({}), dody, "2026-11-18")?.toISOString()).toBe(iso("2026-11-18T10:30"));
    expect(nextPartnerReminderAt(order({ reminders: [iso("2026-11-18T10:30")] }), dody, "2026-11-18")?.toISOString()).toBe(iso("2026-11-18T11:00"));
  });
  it("stops after the last reminder, when confirmed, cancelled or past the delivery day", () => {
    const all = Array.from({ length: MAX_PARTNER_REMINDERS }, () => iso("2026-11-18T10:30"));
    expect(nextPartnerReminderAt(order({ reminders: all }), dody, "2026-11-18")).toBeNull();
    expect(nextPartnerReminderAt(order({ confirmedAt: iso("2026-11-18T10:05") }), dody, "2026-11-18")).toBeNull();
    expect(nextPartnerReminderAt(order({ cancelSentAt: iso("2026-11-18T10:05") }), dody, "2026-11-18")).toBeNull();
    expect(nextPartnerReminderAt(order({ confirmToken: undefined }), dody, "2026-11-18")).toBeNull();
    expect(nextPartnerReminderAt(order({}), dody, "2026-11-20")).toBeNull();
  });
});
