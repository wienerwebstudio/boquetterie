import { getAllProducts, getExtras } from "@/lib/cms";
import { getFloristBudgets } from "@/lib/florist-budget";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/admin/controls";
import { FloristBudgetForm, type BudgetRow } from "@/components/admin/florist-budget-form";

export const dynamic = "force-dynamic";

export default async function FloristBudgetPage() {
  const [products, extras, budgets] = await Promise.all([getAllProducts(true), getExtras(), getFloristBudgets()]);
  const rows: BudgetRow[] = [
    ...products
      .slice()
      .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "de"))
      .flatMap((p) => p.sizes.map((s) => ({
        key: `p:${p.id}:${s.id}`, group: p.name, label: s.label, price: s.price, inactive: !p.active,
        value: budgets.products[p.id]?.[s.id] ?? null,
      }))),
    ...extras
      .filter((e) => e.active)
      .map((e) => ({ key: `x:${e.id}`, group: "Extras", label: e.name, price: e.price, inactive: false, value: budgets.extras[e.id] ?? null })),
  ];
  return (
    <>
      <PageHeader
        title="Floristen-Budget"
        actions={<a href="/admin/floristen-budget/export" className="inline-flex h-10 items-center rounded-md border border-line bg-white px-4 text-[14px] font-semibold text-ink hover:border-forest/50" download>Liste herunterladen (Excel)</a>}
        description={`Max. Budget je Größe und Extra = „Einkauf Dody (Liste)“, also der Betrag, für den die Floristik bindet (der Nachlass wird separat abgerechnet). Steht im Auftrag an die Floristik, nie beim Kunden. ${budgets.updatedAt ? `Zuletzt gespeichert: ${formatDateTime(budgets.updatedAt)}.` : "Es gelten die Startwerte aus der Preiskalkulation (hier änderbar)."}`}
      />
      <FloristBudgetForm rows={rows} />
    </>
  );
}
