import { describe, expect, it } from "vitest";
import type { Order } from "@/types";
import { AUTO_PARTNER_UNTIL, effectivePartner } from "@/lib/partners";

const base = { payment: { method: "card", status: "paid" }, createdAt: "2026-11-01T10:00:00.000Z" } as unknown as Order;

describe("effective partner", () => {
  it("orders paid before the switch count as sent to Blumen Dody", () => {
    const p = effectivePartner({ ...base, payment: { ...base.payment, paidAt: "2026-11-18T08:00:00.000Z" } });
    expect(p).toMatchObject({ id: "blumen-dody", name: "Blumen Dody", sentAt: "2026-11-18T08:00:00.000Z" });
  });
  it("orders paid after the switch have no partner until one is assigned", () => {
    expect(effectivePartner({ ...base, payment: { ...base.payment, paidAt: AUTO_PARTNER_UNTIL } })).toBeUndefined();
  });
  it("unpaid orders never have a partner; an assigned one always wins", () => {
    expect(effectivePartner({ ...base, payment: { ...base.payment, status: "failed" } })).toBeUndefined();
    const own = { id: "rosenhaus", name: "Rosenhaus", assignedAt: "x" };
    expect(effectivePartner({ ...base, partner: own })).toBe(own);
  });
});
