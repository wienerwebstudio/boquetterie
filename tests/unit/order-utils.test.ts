import { describe, expect, it } from "vitest";
import { isOpenOrder, isUnpaidOrder, orderLanguage } from "@/components/admin/order-utils";
import type { Order, SiteSettings } from "@/types";

const settings = { orderStatuses: [{ key: "received", terminal: false }, { key: "paid", terminal: false }, { key: "delivered", terminal: true }] } as unknown as SiteSettings;
const order = (status: string, payment: Order["payment"]["status"]) => ({ status, payment: { status: payment } }) as unknown as Order;

describe("admin order filters", () => {
  it("counts only paid, unfinished orders as open – an abandoned payment is not work to do", () => {
    expect(isOpenOrder(order("paid", "paid"), settings)).toBe(true);
    expect(isOpenOrder(order("received", "pending"), settings)).toBe(false);
    expect(isOpenOrder(order("received", "failed"), settings)).toBe(false);
    expect(isOpenOrder(order("delivered", "paid"), settings)).toBe(false);
  });

  it("marks pending and failed payments as unpaid", () => {
    expect(isUnpaidOrder(order("received", "pending"))).toBe(true);
    expect(isUnpaidOrder(order("received", "failed"))).toBe(true);
    expect(isUnpaidOrder(order("paid", "paid"))).toBe(false);
    expect(isUnpaidOrder(order("refunded", "refunded"))).toBe(false);
  });
});

describe("order language in the admin", () => {
  it("names non-German shop languages and hides German", () => {
    expect(orderLanguage({ locale: "tr" })).toBe("Türkisch");
    expect(orderLanguage({ locale: "ce" })).toBe("Tschetschenisch");
    expect(orderLanguage({})).toBeNull();
    expect(orderLanguage({ locale: "de" })).toBeNull();
  });
});
