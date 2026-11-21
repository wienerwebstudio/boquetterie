import { describe, expect, it } from "vitest";
import type { Extra, Product } from "@/types";
import { floristBudgetCsv } from "@/lib/florist-budget-csv";

describe("floristBudgetCsv", () => {
  it("lists every size and active extra for Excel (semicolon, decimal comma, BOM)", () => {
    const products = [
      { id: "p1", name: "Rosen; rot", active: true, sizes: [{ id: "s", label: "S", price: 39.9 }, { id: "m", label: "M", price: 59 }] },
      { id: "p2", name: "Alt", active: false, sizes: [{ id: "s", label: "S", price: 20 }] },
    ] as unknown as Product[];
    const extras = [{ id: "x1", name: "Vase", price: 9.9, active: true }, { id: "x2", name: "Weg", price: 1, active: false }] as unknown as Extra[];
    const csv = floristBudgetCsv(products, extras, { products: { p1: { s: 12.5 } }, extras: { x1: 3 } });
    const lines = csv.replace("﻿", "").trim().split("\r\n");
    expect(csv.startsWith("﻿")).toBe(true);
    expect(lines).toEqual([
      "Produkt;Größe;Aktiv;Verkaufspreis (EUR);Max. Budget Floristik (EUR)",
      '"Rosen; rot";S;ja;39,90;12,50',
      '"Rosen; rot";M;ja;59,00;',
      "Alt;S;nein;20,00;",
      "Extra;Vase;ja;9,90;3,00",
    ]);
  });
});
