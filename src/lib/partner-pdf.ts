import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { PartnerLedger } from "@/lib/partner-ledger";
import type { PartnerExportScope } from "@/lib/partner-ledger";

/**
 * Partner statement as PDF (admin → Partner-Abrechnung): per partner a list of the owed orders
 * with order number, delivery day and the partner's budget (net), and the sum – to send to the
 * partner or to check their invoice. No customer data, no sale prices. Pure (no I/O) – unit tested.
 */

export interface PartnerPdfInput {
  partners: { name: string; ledger: PartnerLedger }[];
  scope: PartnerExportScope;
  /** Issuer lines at the top (brand name, address). */
  issuer: string[];
  /** "28.11.2026" */
  createdOn: string;
  /** "November 2026" / "alle Monate" */
  periodLabel: string;
}

const A4 = { w: 595.28, h: 841.89 };
const M = 50;
const INK = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.42, 0.4, 0.37);
const FOREST = rgb(0.09, 0.19, 0.12);
const LINE = rgb(0.86, 0.84, 0.8);

/** 45.9 → "€ 45,90" (WinAnsi-safe: plain space, no NBSP). */
export const pdfEuro = (n: number) => `€ ${n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
/** "2026-11-29" → "29.11.2026" */
const date = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : d);
/** Standard fonts only know WinAnsi – drop anything else (e.g. emoji in a partner name). */
const safe = (s: string) => s.replace(/[^\x20-\x7E -ÿ€–—„“”‚‘’…•]/g, "").replace(/ /g, " ");

export function partnerItems(ledger: PartnerLedger, scope: PartnerExportScope) {
  return ledger.owed.filter((i) => (!scope.month || i.order.delivery.date.startsWith(scope.month)) && (!scope.open || !i.paid));
}

export async function partnerStatementPdf(input: PartnerPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(safe(`Blumora – Partner-Abrechnung ${input.periodLabel}`));
  doc.setProducer("Blumora");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const text = (page: PDFPage, s: string, x: number, y: number, o: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb>; right?: boolean } = {}) => {
    const f = o.f ?? font;
    const size = o.size ?? 10;
    const t = safe(s);
    page.drawText(t, { x: o.right ? x - f.widthOfTextAtSize(t, size) : x, y, size, font: f, color: o.color ?? INK });
  };

  const partners = input.partners.length > 1 ? input.partners.filter((p) => partnerItems(p.ledger, input.scope).length) : input.partners;
  if (!partners.length) partners.push(...input.partners.slice(0, 1));

  const cols = { id: M, day: M + 150, status: M + 260, budget: A4.w - M };

  for (const { name, ledger } of partners) {
    const items = partnerItems(ledger, input.scope);
    let page = doc.addPage([A4.w, A4.h]);
    let y = A4.h - M;

    // Header
    text(page, "Blumora", M, y - 6, { size: 20, f: bold, color: FOREST });
    input.issuer.forEach((l, i) => text(page, l, A4.w - M, y - i * 12, { size: 8.5, color: MUTED, right: true }));
    y -= 52;
    text(page, "Abrechnung Partner-Aufträge", M, y, { size: 15, f: bold });
    y -= 22;
    text(page, `Partner: ${name}`, M, y, { size: 11, f: bold });
    y -= 15;
    text(page, `Zeitraum: ${input.periodLabel}${input.scope.open ? " · nur offene (noch nicht bezahlte) Aufträge" : ""}`, M, y, { size: 10, color: MUTED });
    y -= 13;
    text(page, `Erstellt am ${input.createdOn}`, M, y, { size: 10, color: MUTED });
    y -= 28;

    const head = () => {
      text(page, "Bestellnummer", cols.id, y, { size: 9, f: bold, color: MUTED });
      text(page, "Liefertag", cols.day, y, { size: 9, f: bold, color: MUTED });
      text(page, "Status", cols.status, y, { size: 9, f: bold, color: MUTED });
      text(page, "Budget (netto)", cols.budget, y, { size: 9, f: bold, color: MUTED, right: true });
      y -= 7;
      page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 0.8, color: LINE });
      y -= 15;
    };
    head();

    if (!items.length) {
      text(page, "Keine Aufträge in diesem Zeitraum.", M, y, { color: MUTED });
      y -= 18;
    }
    for (const i of items) {
      if (y < M + 70) {
        page = doc.addPage([A4.w, A4.h]);
        y = A4.h - M;
        text(page, `${name} – Fortsetzung`, M, y, { size: 10, f: bold });
        y -= 24;
        head();
      }
      text(page, i.order.id, cols.id, y);
      text(page, date(i.order.delivery.date), cols.day, y);
      text(page, i.order.status === "cancelled" ? "storniert" : i.paid ? "bezahlt" : "offen", cols.status, y, { color: MUTED });
      text(page, i.missing ? `${pdfEuro(i.amount)} (fehlt)` : pdfEuro(i.amount), cols.budget, y, { right: true });
      y -= 16;
    }

    const total = Math.round(items.reduce((s, i) => s + i.amount, 0) * 100) / 100;
    y -= 2;
    page.drawLine({ start: { x: M, y: y + 10 }, end: { x: A4.w - M, y: y + 10 }, thickness: 0.8, color: LINE });
    y -= 6;
    text(page, `Summe (${items.length} ${items.length === 1 ? "Auftrag" : "Aufträge"})`, M, y, { size: 11, f: bold });
    text(page, pdfEuro(total), cols.budget, y, { size: 11, f: bold, right: true });
    y -= 26;
    const notes = ["Beträge netto (Floristen-Budget laut Auftrag), ohne USt."];
    if (items.some((i) => i.missing)) notes.push("(fehlt) = für diesen Auftrag ist kein vollständiges Budget hinterlegt – bitte mit Blumora klären.");
    for (const n of notes) {
      text(page, n, M, y, { size: 8.5, color: MUTED });
      y -= 12;
    }
  }

  // Page numbers
  const pages = doc.getPages();
  pages.forEach((p, i) => text(p, `Seite ${i + 1} von ${pages.length}`, A4.w - M, 28, { size: 8, color: MUTED, right: true }));
  return doc.save();
}
