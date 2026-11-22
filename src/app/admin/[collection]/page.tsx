import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Database, Pencil, Plus, Star } from "lucide-react";
import { readCollection } from "@/lib/cms";
import { formatDateShort, formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Table, Td, Th, YesNo } from "@/components/admin/controls";
import { schemaBySlug, type ColumnDef } from "@/components/admin/schemas";
import { getPath, type Json } from "@/components/admin/paths";

export const dynamic = "force-dynamic";

function Cell({ column, value }: { column: ColumnDef; value: unknown }) {
  switch (column.type) {
    case "image": {
      const src = typeof value === "string" && value.startsWith("/") ? value : null;
      return (
        <div className="relative size-11 overflow-hidden rounded-lg bg-[#f3efe8] ring-1 ring-black/5">
          {src && <Image src={src} alt="" fill sizes="40px" className="object-cover" unoptimized />}
        </div>
      );
    }
    case "price":
      return <span className="tabular-nums font-medium">{typeof value === "number" ? formatPrice(value) : "–"}</span>;
    case "boolean":
      return <YesNo value={value} />;
    case "number":
      return <>{value === null || value === undefined ? <span className="text-ink-soft">–</span> : String(value)}</>;
    case "list":
      return <span className="text-[13px] text-[#5f5c56]">{Array.isArray(value) ? value.join(", ") : ""}</span>;
    case "date":
      return <>{typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDateShort(value) : <span className="text-ink-soft">–</span>}</>;
    case "rating":
      return typeof value === "number" ? <span className="inline-flex items-center gap-1 font-medium"><Star className="size-3.5 fill-[#f0a020] text-[#c27400]" aria-hidden />{value} / 5</span> : <>–</>;
    default:
      return <>{value === undefined || value === null ? <span className="text-ink-soft">–</span> : String(value)}</>;
  }
}

export default async function CollectionListPage({ params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  const schema = schemaBySlug(collection);
  if (!schema) notFound();

  const items = await readCollection<Json[]>(schema.collection);
  const sorted = [...items].sort((a, b) => {
    const sa = typeof a.sortOrder === "number" ? a.sortOrder : 9999;
    const sb = typeof b.sortOrder === "number" ? b.sortOrder : 9999;
    return sa - sb;
  });

  return (
    <>
      <PageHeader
        title={schema.plural}
        description={schema.description}
        actions={
          <>
            {schema.collection === "partners" && <Button href="/admin/partner-abrechnung" size="sm" variant="outline">Abrechnung & Partner-Portal</Button>}
            <Button href={`/admin/${schema.slug}/neu`} size="sm" icon={<Plus className="size-4" aria-hidden />}>Neu</Button>
          </>
        }
      />
      {sorted.length === 0 ? (
        <EmptyState>Noch keine Einträge. <Link href={`/admin/${schema.slug}/neu`} className="font-semibold text-[#0a6644] underline underline-offset-4">Ersten Eintrag anlegen</Link>.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              {schema.columns.map((c) => <Th key={c.key}>{c.label}</Th>)}
              <Th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => {
              const id = String(item[schema.idKey] ?? "");
              const href = `/admin/${schema.slug}/${encodeURIComponent(id)}`;
              return (
                <tr key={id}>
                  {schema.columns.map((c, i) => (
                    <Td key={c.key} className={i === 0 && c.type === "image" ? "w-14" : undefined}>
                      {c.key === schema.labelKey ? (
                        <Link href={href} className="font-semibold text-[#0a6644] underline-offset-4 hover:underline">{String(item[c.key] ?? "")}</Link>
                      ) : (
                        <Cell column={c} value={getPath(item, c.key)} />
                      )}
                    </Td>
                  ))}
                  <Td className="whitespace-nowrap text-right">
                    <Link href={href} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#e7e2d9] bg-white px-3 text-[12.5px] font-semibold text-[#0a6644] transition-colors hover:border-[#0f9466] hover:bg-[#f0faf5]"><Pencil className="size-3.5" aria-hidden />Bearbeiten</Link>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[#5f5c56]"><Database className="size-3.5 text-[#0f8f8f]" aria-hidden />{sorted.length} {sorted.length === 1 ? schema.singular : schema.plural} · Daten: content/{schema.collection}.json</p>
    </>
  );
}
