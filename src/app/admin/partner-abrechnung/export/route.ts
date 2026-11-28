import { NextResponse } from "next/server";
import { getOrders, getPartnerLedgerEntries, getPartnerPortalSettings, getPartners, getSettings } from "@/lib/cms";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { EMPTY_BUDGETS, getFloristBudgets } from "@/lib/florist-budget";
import { buildPartnerLedger, monthLabel, partnerCsv, type PartnerExportScope } from "@/lib/partner-ledger";
import { partnerStatementPdf } from "@/lib/partner-pdf";
import { getLocalNow } from "@/lib/delivery";

export const dynamic = "force-dynamic";

/**
 * GET /admin/partner-abrechnung/export – owed partner orders as Excel (de-AT) CSV. Admin only.
 * `partner` = a partner id or "all"; `month=YYYY-MM` (delivery month, empty = all months);
 * `scope=open` = only orders not yet paid (FIFO); `format=pdf` = statement as PDF (order number,
 * delivery day, budget), else Excel CSV.
 */
export async function GET(req: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 });
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? "";
  const partnerParam = url.searchParams.get("partner") ?? "";
  if (month && !/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ ok: false, message: "month ungültig" }, { status: 400 });
  const scope: PartnerExportScope = { ...(month ? { month } : {}), open: url.searchParams.getAll("scope").includes("open") };

  const partners = await getPartners();
  const chosen = partnerParam === "all" ? partners : partners.filter((p) => p.id === partnerParam);
  if (!chosen.length) return NextResponse.json({ ok: false, message: "partner fehlt" }, { status: 400 });

  const [orders, budgets, entries, settings] = await Promise.all([getOrders(), getFloristBudgets().catch(() => EMPTY_BUDGETS), getPartnerLedgerEntries(), getPartnerPortalSettings()]);
  const list = chosen.map((p) => ({ partnerName: p.name, ledger: buildPartnerLedger({ orders, partnerId: p.id, budgets, entries, settings: settings[p.id] }) }));
  const what = `${month || "gesamt"}${scope.open ? "-offen" : ""}`;
  const who = partnerParam === "all" ? "alle" : chosen[0].id;
  if (url.searchParams.get("format") === "pdf") {
    const settings = await getSettings();
    const b = settings.brand;
    const today = getLocalNow(settings.timezone).date;
    const pdf = await partnerStatementPdf({
      partners: list.map((l) => ({ name: l.partnerName, ledger: l.ledger })),
      scope,
      issuer: [b.legalName && !b.legalName.startsWith("[") ? b.legalName : b.name, `${b.address.street}, ${b.address.zip} ${b.address.city}`, b.email].filter((x) => x && !x.startsWith("[")),
      createdOn: `${today.slice(8, 10)}.${today.slice(5, 7)}.${today.slice(0, 4)}`,
      periodLabel: month ? monthLabel(month) : "alle Monate",
    });
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="blumora-abrechnung-${who}-${what}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return new NextResponse(partnerCsv(list, scope), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="blumora-partner-${who}-${what}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
