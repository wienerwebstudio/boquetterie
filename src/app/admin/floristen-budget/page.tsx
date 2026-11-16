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
        description={`Einkaufsbudget (netto) je Größe und Extra – steht im Auftrag an die Floristik, nie beim Kunden. ${budgets.updatedAt ? `Zuletzt gespeichert: ${formatDateTime(budgets.updatedAt)}.` : "Noch nichts gespeichert."}`}
      />
      <FloristBudgetForm rows={rows} />
    </>
  );
}
