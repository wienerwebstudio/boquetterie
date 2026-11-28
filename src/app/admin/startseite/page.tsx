import { getHomepage } from "@/lib/cms";
import { PageHeader } from "@/components/admin/controls";
import { EntityForm } from "@/components/admin/entity-form";
import { loadOptions } from "@/components/admin/options";
import { homepageSchema } from "@/components/admin/schemas";
import type { Json } from "@/components/admin/paths";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [data, options] = await Promise.all([getHomepage(), loadOptions(homepageSchema.sections)]);
  return (
    <>
      <PageHeader title={homepageSchema.title} description={homepageSchema.description} />
      <EntityForm
        title={homepageSchema.title}
        sections={homepageSchema.sections}
        initial={data as unknown as Json}
        options={options}
        collection={homepageSchema.collection}
        kind="singleton"
      />
    </>
  );
}
