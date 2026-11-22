import { describe, expect, it } from "vitest";
import type { Order } from "@/types";
import { euro, filterOrders, orderLinesCsv, ordersCsv, ordersJson, viennaDateTime } from "@/lib/orders-export";

const settings = { orderStatuses: [] } as never;
const order = (id: string, over: Partial<Order> = {}): Order => ({
  id, token: "secret-token-xyz", createdAt: "2026-11-21T18:55:00.000Z", status: "received",
  history: [{ status: "received", at: "2026-11-21T18:55:00.000Z", note: "Zahlung nicht abgeschlossen" }],
  recipient: { firstName: "Jakub", lastName: "N.", street: "Hauptstraße", houseNumber: "1", addition: "Top 3", zip: "1170", city: "Wien", country: "AT", phone: "+43 1" },
  delivery: { date: "2026-11-22", windowLabel: "14–16 Uhr", zoneId: "z", zoneName: "Wien", fee: 4.9 },
  customer: { firstName: "Emre", lastName: "T.", email: "emre@example.com", phone: "+43 2" },
  lines: [{ productId: "p1", productName: "Gelb Bouquet", sizeId: "m" as never, sizeLabel: "Mittel", quantity: 2, unitPrice: 45.9, image: "",
    extras: [{ extraId: "e1", name: "Duftkerze", quantity: 1, unitPrice: 4.9, floristBudget: 2 }], floristBudget: 20, message: "Alles Gute; \"Mama\"", anonymous: false, senderName: "Emre" }],
  totals: { subtotal: 91.8, extras: 4.9, delivery: 4.9, discount: 0, total: 101.6 },
  payment: { method: "google_pay", status: "failed", provider: "stripe", intentId: "pi_123" },
  partner: { id: "p", name: "Dody", assignedAt: "2026-11-21T19:00:00.000Z", confirmToken: "confirm-secret" },
  ...over,
});

describe("orders export", () => {
  it("formats euro and Vienna time for Excel", () => {
    expect(euro(45.9)).toBe("45,90");
    expect(euro(undefined)).toBe("");
    expect(viennaDateTime("2026-11-21T18:55:00.000Z")).toBe("2026-11-21 19:55");
  });

  it("one row per order with header, BOM, semicolons, quoting and all key fields", () => {
    const csv = ordersCsv([order("BQ-1")], settings);
    expect(csv.startsWith("﻿Bestellnummer;Erstellt;")).toBe(true);
    const [, row] = csv.trim().split("\r\n");
    expect(row).toContain("BQ-1;2026-11-21 19:55;");
    expect(row).toContain("emre@example.com");
    expect(row).toContain("Hauptstraße;1;Top 3;1170;Wien");
    expect(row).toContain("101,60");
    expect(row).toContain("\"Alles Gute; \"\"Mama\"\" – Emre\"");
    expect(row).toContain("42,00"); // florist budget: 2 × 20 + 1 × 2
    expect(csv).not.toContain("secret-token-xyz");
    expect(csv).not.toContain("confirm-secret");
  });

  it("one row per line in the lines export", () => {
    const csv = orderLinesCsv([order("BQ-1"), order("BQ-2")], settings);
    const rows = csv.trim().split("\r\n");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toContain("Gelb Bouquet;p1;Mittel;;;2;45,90;1 × Duftkerze (4,90);96,70");
  });

  it("JSON keeps all data except the secret tokens", () => {
    const json = JSON.parse(ordersJson([order("BQ-1")]));
    expect(json.count).toBe(1);
    expect(json.orders[0].token).toBeUndefined();
    expect(json.orders[0].partner.confirmToken).toBeUndefined();
    expect(json.orders[0].partner.name).toBe("Dody");
    expect(json.orders[0].payment.intentId).toBe("pi_123");
  });

  it("applies the list filter and search; defuses formulas", () => {
    const list = [order("BQ-1"), order("BQ-2", { payment: { method: "card", status: "paid" }, customer: { firstName: "=cmd", lastName: "X", email: "x@example.com", phone: "1" } })];
    expect(filterOrders(list, { status: "unpaid" }, settings).map((o) => o.id)).toEqual(["BQ-1"]);
    expect(filterOrders(list, { q: "x@example" }, settings).map((o) => o.id)).toEqual(["BQ-2"]);
    expect(ordersCsv(list, settings)).toContain(";'=cmd;");
    expect(ordersCsv(list, settings)).toContain(";+43 2;");
  });
});
