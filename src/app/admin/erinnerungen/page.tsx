import { Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { formatReminderDate, getReminders } from "@/lib/mail/reminders";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Table, Td, Th, YesNo } from "@/components/admin/controls";
import { deleteReminder } from "./actions";

export const dynamic = "force-dynamic";

export default async function RemindersAdminPage() {
  const reminders = (await getReminders()).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const confirmed = reminders.filter((r) => r.confirmed).length;

  return (
    <>
      <PageHeader
        title="Anlass-Erinnerungen"
        description={`${reminders.length} Erinnerungen, davon ${confirmed} bestätigt. Versand täglich über /api/cron/reminders (siehe docs/MAIL.md). Daten: data/reminders.json.`}
      />
      {reminders.length === 0 ? (
        <EmptyState>Noch keine Erinnerungen. Kund:innen legen sie unter /erinnerung an.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>E-Mail</Th><Th>Anlass</Th><Th>Für</Th><Th>Datum</Th><Th>Vorlauf</Th><Th>Jährlich</Th><Th>Bestätigt</Th><Th>Zuletzt gesendet</Th><Th>Angelegt</Th><Th className="text-right">Aktion</Th>
            </tr>
          </thead>
          <tbody>
            {reminders.map((r) => (
              <tr key={r.id}>
                <Td><a href={`mailto:${r.email}`} className="text-forest underline-offset-4 hover:underline">{r.email}</a></Td>
                <Td>{r.occasionLabel}{r.occasionSlug === "eigener" && <span className="ml-1 text-[12px] text-ink-soft">(eigener)</span>}</Td>
                <Td className="text-ink-muted">{r.personName ?? "–"}</Td>
                <Td className="whitespace-nowrap">{formatReminderDate(r)}</Td>
                <Td className="whitespace-nowrap text-ink-muted">{r.leadDays} Tage</Td>
                <Td><YesNo value={r.yearly} /></Td>
                <Td><YesNo value={r.confirmed} /></Td>
                <Td className="text-ink-muted">{r.lastSentYear ?? "–"}</Td>
                <Td className="whitespace-nowrap text-ink-muted">{formatDateTime(r.createdAt)}</Td>
                <Td className="text-right">
                  <form action={deleteReminder}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" size="sm" variant="ghost" icon={<Trash2 className="size-4" aria-hidden />}>Löschen</Button>
                  </form>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
