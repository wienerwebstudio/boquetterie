import Link from "next/link";
import { Download, Plus, Upload } from "lucide-react";
import { getOutreachContacts, getOutreachSends } from "@/lib/cms";
import { contactRows } from "@/lib/outreach/rows";
import { unsubscribedSet } from "@/lib/outreach/service";
import { PageHeader } from "@/components/admin/controls";
import { OutreachNav, btnOutline, btnPrimary } from "@/components/admin/outreach/bits";
import { ContactsBoard } from "@/components/admin/outreach/contacts-board";
import { QueueCard } from "@/components/admin/outreach/queue-card";
import { queueStats } from "./queue-stats";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const [contacts, sends, blocked] = await Promise.all([getOutreachContacts(), getOutreachSends(), unsubscribedSet()]);
  const rows = contactRows(contacts, sends, blocked);
  return (
    <>
      <PageHeader
        title="Outreach"
        description="Persönliche E-Mails an Betriebe: Partneranfragen an Floristiken und Angebote an Bestatter, Hotels, Büros und Lokale. Jede Mail geht einzeln an genau einen Kontakt."
        actions={
          <>
            <a href="/admin/outreach/export" download className={btnOutline}><Download className="size-4" aria-hidden /> CSV-Export</a>
            <Link href="/admin/outreach/import" className={btnOutline}><Upload className="size-4" aria-hidden /> Importieren</Link>
            <Link href="/admin/outreach/kontakte/neu" className={btnPrimary}><Plus className="size-4" aria-hidden /> Kontakt anlegen</Link>
          </>
        }
      />
      <OutreachNav active="/admin/outreach" />
      <QueueCard stats={queueStats(sends)} />
      <ContactsBoard rows={rows} />
    </>
  );
}
