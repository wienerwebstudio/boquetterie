import { notFound } from "next/navigation";
import { readCollection } from "@/lib/cms";
import { PageHeader } from "@/components/admin/controls";
import { EntityForm } from "@/components/admin/entity-form";
import { loadOptions } from "@/components/admin/options";
import { schemaBySlug, type AdminCollection } from "@/components/admin/schemas";
import type { Json } from "@/components/admin/paths";

export const dynamic = "force-dynamic";

const STOREFRONT: Partial<Record<AdminCollection, (item: Json) => string | null>> = {
  products: (p) => (p.slug ? `/produkt/${p.slug}` : null),
  categories: (c) => (c.slug === "alle" ? "/blumen" : c.slug ? `/blumen/${c.slug}` : null),
  occasions: (o) => (o.slug ? `/anlaesse/${o.slug}` : null),
  pages: (p) => (p.slug ? `/${p.slug}` : null),
};

export default async function EntityEditPage({ params, searchParams }: { params: Promise<{ collection: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ collection, id: rawId }, sp] = await Promise.all([params, searchParams]);
  const schema = schemaBySlug(collection);
  if (!schema) notFound();
  const id = decodeURIComponent(rawId);
  const isNew = id === "neu";

  const [items, options] = await Promise.all([readCollection<Json[]>(schema.collection), loadOptions(schema.sections)]);
  const existing = isNew ? null : items.find((item) => String(item[schema.idKey]) === id);
  if (!isNew && !existing) notFound();

  const initial: Json = existing ?? structuredClone(schema.template);
  const label = existing ? String(existing[schema.labelKey] ?? id) : `Neu: ${schema.singular}`;
  const listHref = `/admin/${schema.slug}`;

  return (
    <>
      <PageHeader
        back={{ href: listHref, label: schema.plural }}
        title={label}
        description={isNew ? `${schema.singular} anlegen. Pflichtfelder sind mit * markiert.` : `${schema.singular} bearbeiten · ${schema.idKey}: ${id}`}
      />
      <EntityForm
        key={id}
        title={label}
        sections={schema.sections}
        initial={initial}
        options={options}
        collection={schema.collection}
        kind="entity"
        originalId={isNew ? null : id}
        listHref={listHref}
        editHrefBase={listHref}
        storefrontHref={existing ? STOREFRONT[schema.collection]?.(existing) ?? null : null}
        singular={schema.singular}
        initialMessage={sp.saved ? "Gespeichert. Der Shop zeigt die Änderung sofort." : null}
      />
    </>
  );
}
