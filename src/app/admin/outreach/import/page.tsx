import { PageHeader } from "@/components/admin/controls";
import { OutreachNav } from "@/components/admin/outreach/bits";
import { ImportForm } from "@/components/admin/outreach/import-form";

export const dynamic = "force-dynamic";

export default function OutreachImportPage() {
  return (
    <>
      <PageHeader
        title="Kontakte importieren"
        description="CSV- oder TSV-Datei hochladen oder eine Tabelle aus Excel einfügen. Vor dem Speichern seht ihr eine Vorschau; doppelte und abgemeldete Adressen werden erkannt."
        back={{ href: "/admin/outreach", label: "Outreach" }}
      />
      <OutreachNav active="/admin/outreach/import" />
      <ImportForm />
    </>
  );
}
