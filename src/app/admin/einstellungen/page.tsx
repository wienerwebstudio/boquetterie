import { getSettings } from "@/lib/cms";
import { PageHeader } from "@/components/admin/controls";
import { EntityForm } from "@/components/admin/entity-form";
import { loadOptions } from "@/components/admin/options";
import { settingsSchema } from "@/components/admin/schemas";
import type { Json } from "@/components/admin/paths";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [data, options] = await Promise.all([getSettings(), loadOptions(settingsSchema.sections)]);
  return (
    <>
      <PageHeader title={settingsSchema.title} description={settingsSchema.description} />
      <EntityForm
        title={settingsSchema.title}
        sections={settingsSchema.sections}
        initial={data as unknown as Json}
        options={options}
        collection={settingsSchema.collection}
        kind="singleton"
      />
    </>
  );
}
