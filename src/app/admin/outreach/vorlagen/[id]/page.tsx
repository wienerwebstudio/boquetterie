import { notFound } from "next/navigation";
import { getOutreachContacts, getOutreachTemplates, getSettings } from "@/lib/cms";
import { adminMailAddress } from "@/lib/mail";
import { contactLabel } from "@/lib/outreach/format";
import { outreachBrand } from "@/lib/outreach/render";
import { PageHeader } from "@/components/admin/controls";
import { OutreachNav } from "@/components/admin/outreach/bits";
import { TemplateEditor, type PreviewContact } from "@/components/admin/outreach/template-editor";

export const dynamic = "force-dynamic";

export default async function OutreachTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [templates, contacts, settings] = await Promise.all([getOutreachTemplates(), getOutreachContacts(), getSettings()]);
  const template = id === "neu" ? undefined : templates.find((t) => t.id === id);
  if (id !== "neu" && !template) notFound();
  const brand = outreachBrand(settings);
  const preview: PreviewContact[] = contacts
    .map((c) => ({ id: c.id, label: contactLabel(c), salutation: c.salutation, firstName: c.firstName, lastName: c.lastName, company: c.company, district: c.district }))
    .sort((a, b) => a.label.localeCompare(b.label, "de"));
  const defaultTestTo = adminMailAddress() || brand.email || "office@blumora.at";
  return (
    <>
      <PageHeader title={template ? template.name : "Neue Vorlage"} back={{ href: "/admin/outreach/vorlagen", label: "Vorlagen" }} />
      <OutreachNav active="/admin/outreach/vorlagen" />
      <TemplateEditor template={template} brand={brand} contacts={preview} defaultTestTo={defaultTestTo} />
    </>
  );
}
