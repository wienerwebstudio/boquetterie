import { getOutreachContacts, getOutreachSends, getOutreachTemplates } from "@/lib/cms";
import { contactRows } from "@/lib/outreach/rows";
import { unsubscribedSet } from "@/lib/outreach/service";
import { dailyLimit, localDate, recentlyMailed, sentToday } from "@/lib/outreach/queue";
import { PageHeader } from "@/components/admin/controls";
import { OutreachNav } from "@/components/admin/outreach/bits";
import { SendComposer } from "@/components/admin/outreach/send-composer";

export const dynamic = "force-dynamic";

export default async function OutreachSendPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const [contacts, sends, templates, blocked] = await Promise.all([getOutreachContacts(), getOutreachSends(), getOutreachTemplates(), unsubscribedSet()]);
  const now = new Date();
  const rows = contactRows(contacts, sends, blocked);
  const contactParam = typeof sp.contact === "string" ? sp.contact : "";
  const sorted = templates.slice().sort((a, b) => a.name.localeCompare(b.name, "de"));
  return (
    <>
      <PageHeader
        title="Senden"
        description="Vorlage wählen, Kontakte auswählen, jetzt senden oder planen. Jede Mail ist persönlich (Anrede, Firma …) und hat einen Abmeldelink."
        back={{ href: "/admin/outreach", label: "Outreach" }}
      />
      <OutreachNav active="/admin/outreach/senden" />
      <SendComposer
        templates={sorted.map((t) => ({ id: t.id, name: t.name, category: t.category, language: t.language }))}
        rows={rows}
        recentIds={[...recentlyMailed(contacts, now)]}
        sentToday={sentToday(sends, now)}
        limit={dailyLimit()}
        today={localDate(now)}
        initialSelection={contactParam && contacts.some((c) => c.id === contactParam) ? [contactParam] : []}
        followUpDefault={sorted.find((t) => t.category === "nachfassen")?.id ?? sorted[0]?.id ?? ""}
      />
    </>
  );
}
