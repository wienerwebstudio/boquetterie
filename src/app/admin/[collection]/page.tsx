import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
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
        <div className="relative size-10 overflow-hidden rounded-md bg-ivory-200">
          {src && <Image src={src} alt="" fill sizes="40px" className="object-cover" unoptimized />}
        </div>
      );
    }
    case "price":
      return <>{typeof value === "number" ? formatPrice(value) : "–"}</>;
    case "boolean":
      return <YesNo value={value} />;
    case "number":
      return <>{value === null || value === undefined ? <span className="text-ink-soft">–</span> : String(value)}</>;
    case "list":
      return <span className="text-[13px] text-ink-muted">{Array.isArray(value) ? value.join(", ") : ""}</span>;
    case "date":
      return <>{typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDateShort(value) : <span className="text-ink-soft">–</span>}</>;
    case "rating":
      return <>{typeof value === "number" ? `${value} / 5` : "–"}</>;
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
        actions={<Button href={`/admin/${schema.slug}/neu`} size="sm" icon={<Plus className="size-4" aria-hidden />}>Neu</Button>}
      />
      {sorted.length === 0 ? (
        <EmptyState>Noch keine Einträge. <Link href={`/admin/${schema.slug}/neu`} className="font-semibold text-forest underline underline-offset-4">Ersten Eintrag anlegen</Link>.</EmptyState>
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
                <tr key={id} className="hover:bg-ivory-100/60">
                  {schema.columns.map((c, i) => (
                    <Td key={c.key} className={i === 0 && c.type === "image" ? "w-14" : undefined}>
                      {c.key === schema.labelKey ? (
                        <Link href={href} className="font-semibold text-forest underline-offset-4 hover:underline">{String(item[c.key] ?? "")}</Link>
                      ) : (
                        <Cell column={c} value={getPath(item, c.key)} />
                      )}
                    </Td>
                  ))}
                  <Td className="whitespace-nowrap text-right">
                    <Link href={href} className="text-[13px] font-semibold text-forest underline-offset-4 hover:underline">Bearbeiten</Link>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <p className="mt-3 text-[12px] text-ink-soft">{sorted.length} {sorted.length === 1 ? schema.singular : schema.plural} · Daten: content/{schema.collection}.json</p>
    </>
  );
}
