import Link from "next/link";
import { getSubscription } from "@/lib/cms";
import { PageHeader } from "@/components/admin/controls";
import { EntityForm } from "@/components/admin/entity-form";
import { loadOptions } from "@/components/admin/options";
import { subscriptionSchema } from "@/components/admin/schemas";
import type { Json } from "@/components/admin/paths";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [data, options] = await Promise.all([getSubscription(), loadOptions(subscriptionSchema.sections)]);
  return (
    <>
      <PageHeader title={subscriptionSchema.title} description={subscriptionSchema.description}
        actions={<Link href="/admin/blumen-abo/anfragen" className="text-[13px] font-semibold text-forest underline-offset-4 hover:underline">Abo-Anfragen ansehen</Link>} />
      <EntityForm
        title={subscriptionSchema.title}
        sections={subscriptionSchema.sections}
        initial={data as unknown as Json}
        options={options}
        collection={subscriptionSchema.collection}
        kind="singleton"
      />
    </>
  );
}
