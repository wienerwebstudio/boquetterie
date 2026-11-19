import Link from "next/link";
import { getOutreachContacts, getOutreachSends } from "@/lib/cms";
import { contactLabel, SEND_STATUS_LABELS } from "@/lib/outreach/format";
import { viennaDateTime } from "@/lib/format";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/admin/controls";
import { OutreachNav, TrackingChips, TRACKING_NOTE } from "@/components/admin/outreach/bits";
import { QueueCard } from "@/components/admin/outreach/queue-card";
import { CancelSendButton } from "@/components/admin/outreach/cancel-send-button";
import type { OutreachSend } from "@/types/outreach";
import { queueStats } from "../queue-stats";

export const dynamic = "force-dynamic";

const TONE: Record<OutreachSend["status"], string> = {
  queued: "text-warn", sending: "text-warn", sent: "text-success", failed: "text-danger", skipped: "text-ink-muted", cancelled: "text-ink-muted",
};

export default async function OutreachLogPage() {
  const [sends, contacts] = await Promise.all([getOutreachSends(), getOutreachContacts()]);
  const names = new Map(contacts.map((c) => [c.id, contactLabel(c)]));
  const queued = sends.filter((s) => s.status === "queued").sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  const log = sends
    .filter((s) => s.status !== "queued")
    .sort((a, b) => (b.sentAt ?? b.claimedAt ?? b.createdAt).localeCompare(a.sentAt ?? a.claimedAt ?? a.createdAt))
    .slice(0, 400);
  const sent = sends.filter((s) => s.status === "sent");
  const opened = sent.filter((s) => s.opens > 0).length;
  const clicked = sent.filter((s) => s.clicks.length > 0).length;

  const who = (s: OutreachSend) => (
    <>
      <Link href={`/admin/outreach/kontakte/${s.contactId}`} className="font-semibold text-ink underline-offset-4 hover:text-forest hover:underline">{names.get(s.contactId) ?? s.email}</Link>
      <p className="text-[12px] text-ink-muted">{s.email}</p>
    </>
  );

  return (
    <>
      <PageHeader
        title="Versand & Warteschlange"
        description={`${sent.length} gesendet · ${opened} geöffnet (ungefähr) · ${clicked} mit Klick. Geplante Mails, der Rest über dem Tageslimit und das Nachfassen werden alle 10 Minuten automatisch abgearbeitet.`}
        back={{ href: "/admin/outreach", label: "Outreach" }}
      />
      <OutreachNav active="/admin/outreach/versand" />
      <QueueCard stats={queueStats(sends)} />

      <h2 className="mb-3 mt-8 flex items-center justify-between gap-3 text-[15px] font-semibold text-ink">
        Warteschlange ({queued.length})
        {queued.length > 1 && <CancelSendButton ids={queued.map((s) => s.id)} label="Alle abbrechen" />}
      </h2>
      {queued.length === 0 ? <EmptyState>Nichts geplant.</EmptyState> : (
        <Table>
          <thead><tr><Th>Kontakt</Th><Th>Vorlage</Th><Th>Geplant für</Th><Th /></tr></thead>
          <tbody>
            {queued.map((s) => (
              <tr key={s.id}>
                <Td>{who(s)}</Td>
                <Td>{s.templateName}{s.kind === "followup" && <span className="ml-1 text-[12px] text-ink-muted">(Nachfassen, nur wenn noch „Angeschrieben“)</span>}{s.followUp && <p className="text-[12px] text-ink-muted">Nachfassen nach {s.followUp.days} Tagen</p>}</Td>
                <Td className="whitespace-nowrap text-[13px]">{viennaDateTime(new Date(s.scheduledFor))}</Td>
                <Td className="text-right"><CancelSendButton ids={[s.id]} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <h2 className="mb-3 mt-10 text-[15px] font-semibold text-ink">Protokoll</h2>
      {log.length === 0 ? <EmptyState>Noch nichts gesendet.</EmptyState> : (
        <>
          <Table>
            <thead><tr><Th>Kontakt</Th><Th>Vorlage / Betreff</Th><Th>Status</Th><Th>Zeitpunkt</Th><Th>Tracking</Th></tr></thead>
            <tbody>
              {log.map((s) => (
                <tr key={s.id}>
                  <Td>{who(s)}</Td>
                  <Td>
                    <p>{s.templateName}{s.kind === "followup" && <span className="ml-1 text-[12px] text-ink-muted">(Nachfassen)</span>}</p>
                    {s.subject && <p className="text-[12px] text-ink-muted">{s.subject}</p>}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <span className={`font-semibold ${TONE[s.status]}`}>{SEND_STATUS_LABELS[s.status]}</span>
                    {s.provider === "console" && <span className="text-[12px] text-ink-muted"> (nur Log)</span>}
                    {(s.error || s.reason) && <p className="max-w-[260px] whitespace-normal text-[12px] text-ink-muted">{s.error ?? s.reason}</p>}
                  </Td>
                  <Td className="whitespace-nowrap text-[13px] text-ink-muted">{viennaDateTime(new Date(s.sentAt ?? s.claimedAt ?? s.createdAt))}</Td>
                  <Td><TrackingChips opened={s.opens > 0} clicked={s.clicks.length > 0} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="mt-2 text-[12px] text-ink-soft">{TRACKING_NOTE}</p>
        </>
      )}
    </>
  );
}
