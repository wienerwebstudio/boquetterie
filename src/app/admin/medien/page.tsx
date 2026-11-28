import { PageHeader } from "@/components/admin/controls";
import { getUploadDriver, listUploads } from "@/lib/uploads";
import { MediaLibrary } from "./media-library";

export const dynamic = "force-dynamic";

/** /admin/medien – uploads library (protected by the proxy + admin layout). */
export default async function MediaPage() {
  const driver = getUploadDriver();
  const items = await listUploads().catch(() => []);
  return (
    <>
      <PageHeader
        title="Medien"
        description="Hochgeladene Bilder für Produkte, Anlässe und Seiten. Pfad kopieren und in ein Bildfeld einfügen – oder dort direkt „Aus Medien wählen“ nutzen."
      />
      <MediaLibrary initialItems={items} driver={driver} />
    </>
  );
}
