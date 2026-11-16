"use client";
import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { saveFloristBudgetsAction } from "@/app/admin/actions";
import { Banner, inputCls, Table, Td, Th } from "@/components/admin/controls";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/format";

export interface BudgetRow {
  /** `p:<productId>:<sizeId>` or `x:<extraId>` */
  key: string;
  group: string;
  label: string;
  price: number;
  inactive: boolean;
  value: number | null;
}

type Values = Record<string, string>;

const toText = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n).replace(".", ","));

function toDocument(values: Values) {
  const doc: { products: Record<string, Record<string, string>>; extras: Record<string, string> } = { products: {}, extras: {} };
  for (const [key, value] of Object.entries(values)) {
    if (!value.trim()) continue;
    const [kind, id, sizeId] = key.split(":");
    if (kind === "p" && id && sizeId) (doc.products[id] ??= {})[sizeId] = value;
    if (kind === "x" && id) doc.extras[id] = value;
  }
  return doc;
}

/** Editable budget table; a JSON file ({ products: { id: { size: € } }, extras: { id: € } }) fills it before saving. */
export function FloristBudgetForm({ rows }: { rows: BudgetRow[] }) {
  const [values, setValues] = useState<Values>(() => Object.fromEntries(rows.map((r) => [r.key, toText(r.value)])));
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const missing = rows.filter((r) => !r.inactive && !values[r.key]?.trim()).length;

  const importFile = async (file: File) => {
    try {
      const doc = JSON.parse(await file.text()) as { products?: Record<string, Record<string, unknown>>; extras?: Record<string, unknown> };
      const next = { ...values };
      let filled = 0;
      for (const [productId, sizes] of Object.entries(doc.products ?? {})) {
        for (const [sizeId, v] of Object.entries(sizes ?? {})) {
          const key = `p:${productId}:${sizeId}`;
          if (key in next && v !== null && v !== undefined && v !== "") { next[key] = toText(Number(v)); filled++; }
        }
      }
      for (const [extraId, v] of Object.entries(doc.extras ?? {})) {
        const key = `x:${extraId}`;
        if (key in next && v !== null && v !== undefined && v !== "") { next[key] = toText(Number(v)); filled++; }
      }
      setValues(next);
      setResult({ ok: true, message: `${filled} Werte aus „${file.name}“ übernommen – bitte prüfen und speichern.` });
    } catch {
      setResult({ ok: false, message: "Die Datei konnte nicht gelesen werden (erwartet: JSON-Datei mit Budgets)." });
    }
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setResult(await saveFloristBudgetsAction(toDocument(values))));
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>{pending ? "Wird gespeichert …" : "Budgets speichern"}</Button>
        <Button type="button" variant="outline" icon={<Upload className="size-4" aria-hidden />} onClick={() => fileRef.current?.click()}>Datei importieren</Button>
        <input
          ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ""; }}
        />
        <span className="text-[13px] text-ink-muted">{missing ? `${missing} aktive Positionen ohne Budget` : "Alle aktiven Positionen haben ein Budget."}</span>
      </div>
      {result && <Banner tone={result.ok ? "success" : "error"}>{result.message}</Banner>}

      <Table>
        <thead>
          <tr><Th>Produkt</Th><Th>Größe</Th><Th className="text-right">Verkaufspreis</Th><Th className="w-44">Budget netto (€)</Th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const first = i === 0 || rows[i - 1].group !== r.group;
            const id = `budget-${r.key.replace(/[^a-z0-9-]/gi, "-")}`;
            return (
              <tr key={r.key} className={cn(r.inactive && "opacity-60")}>
                <Td className={cn("font-semibold", !first && "text-transparent")}>{r.group}{first && r.inactive ? <span className="ml-2 text-[12px] font-normal text-ink-muted">(inaktiv)</span> : null}</Td>
                <Td><label htmlFor={id}>{r.label}</label></Td>
                <Td className="text-right tabular-nums text-ink-muted">{formatPrice(r.price)}</Td>
                <Td>
                  <input
                    id={id} inputMode="decimal" autoComplete="off" placeholder="–"
                    value={values[r.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [r.key]: e.target.value }))}
                    className={cn(inputCls, "h-9 text-right tabular-nums")}
                    aria-label={`Budget ${r.group} ${r.label}`}
                  />
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </form>
  );
}
