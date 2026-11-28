import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import type { Order } from "@/types";
import type { LedgerItem, PartnerLedger } from "@/lib/partner-ledger";
import { acceptedLabel, partnerItems, partnerStatementPdf, pdfEuro } from "@/lib/partner-pdf";

const item = (id: string, date: string, amount: number, over: Partial<LedgerItem> = {}): LedgerItem => ({
  order: { id, status: "delivered", createdAt: "2026-11-02T09:15:00.000Z", payment: { method: "card", status: "paid" }, delivery: { date }, partner: { id: "dody", name: "Dody", assignedAt: "2026-11-02T09:20:00.000Z", confirmedAt: "2026-11-02T10:05:00.000Z" } } as Order,
  amount, missing: false, computed: false, owed: "confirmed", inPeriod: true, upcoming: false, paid: false, ...over,
});
const ledger = (owed: LedgerItem[]) => ({ owed } as PartnerLedger);

describe("partner statement PDF", () => {
  const dody = ledger([item("BQ-AAA111", "2026-11-03", 30, { paid: true }), item("BQ-BBB222", "2026-11-20", 45.5), item("BQ-CCC333", "2026-12-01", 0, { missing: true })]);

  it("filters by month and open", () => {
    expect(partnerItems(dody, { month: "2026-11" }).map((i) => i.order.id)).toEqual(["BQ-AAA111", "BQ-BBB222"]);
    expect(partnerItems(dody, { open: true }).map((i) => i.order.id)).toEqual(["BQ-BBB222", "BQ-CCC333"]);
    expect(pdfEuro(1234.5)).toBe("€ 1.234,50");
    expect(acceptedLabel(dody.owed[0])).toBe("02.11.2026 11:05");
    expect(acceptedLabel({ ...dody.owed[0], owed: "legacy" })).toBe("vor Portal-Start");
  });

  it("renders one section per partner with entries, also with many orders (page break)", async () => {
    const many = ledger(Array.from({ length: 80 }, (_, i) => item(`BQ-M${String(i).padStart(5, "0")}`, "2026-11-10", 20)));
    const bytes = await partnerStatementPdf({
      partners: [{ name: "Blumen Dody", ledger: dody }, { name: "L'Art 🌸", ledger: many }, { name: "Leer", ledger: ledger([]) }],
      scope: {}, issuer: ["Blumora", "Bachgasse 22/11, 1160 Wien"], createdOn: "28.11.2026", periodLabel: "alle Monate",
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(3); // Dody + 2 pages L'Art, empty partner skipped
    expect(pdf.getTitle()).toContain("Partner-Abrechnung");
  });
});
