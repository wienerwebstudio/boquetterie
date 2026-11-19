import { notFound } from "next/navigation";
import { Eye, MousePointerClick, Send, CircleSlash, MessageSquare, Pencil, Upload, Clock, AlertTriangle, Ban, UserPlus, Tag } from "lucide-react";
import { getOutreachContacts, getOutreachSends } from "@/lib/cms";
import { CATEGORY_LABELS, contactLabel, contactName, normalizeEmail, SALUTATION_LABELS, SEND_STATUS_LABELS } from "@/lib/outreach/format";
import { unsubscribedSet } from "@/lib/outreach/service";
import { viennaDateTime } from "@/lib/format";
import { Card, PageHeader, Table, Td, Th } from "@/components/admin/controls";
import { OutreachNav, OutreachStatusBadge, TrackingChips, UnsubscribedChip, TRACKING_NOTE } from "@/components/admin/outreach/bits";
import { ContactForm } from "@/components/admin/outreach/contact-form";
import { ContactDangerZone, NotesPanel, StatusPicker } from "@/components/admin/outreach/contact-actions";
import type { OutreachEventType } from "@/types/outreach";

export const dynamic = "force-dynamic";

const ICONS: Record<OutreachEventType, typeof Send> = {
  created: UserPlus, imported: Upload, updated: Pencil, status: Tag, note: MessageSquare, queued: Clock, sent: Send,
  failed: AlertTriangle, skipped: CircleSlash, cancelled: CircleSlash, open: Eye, click: MousePointerClick, unsubscribed: Ban,
};

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "neu") {
    return (
      <>
        <PageHeader title="Kontakt anlegen" back={{ href: "/admin/outreach", label: "Outreach" }} />
        <OutreachNav active="/admin/outreach" />
        <div className="max-w-3xl"><Card><ContactForm /></Card></div>
      </>
    );
  }
  const [contacts, sends, blocked] = await Promise.all([getOutreachContacts(), getOutreachSends(), unsubscribedSet()]);
  const contact = contacts.find((c) => c.id === id);
  if (!contact) notFound();
  const unsubscribed = blocked.has(normalizeEmail(contact.email));
  const mine = sends.filter((s) => s.contactId === id).sort((a, b) => (b.sentAt ?? b.scheduledFor).localeCompare(a.sentAt ?? a.scheduledFor));
  const history = contact.history.slice().reverse();
  const person = [contact.salutation ? SALUTATION_LABELS[contact.salutation] : "", contactName(contact)].filter(Boolean).join(" ");

  return (
    <>
      <PageHeader
        title={<span className="inline-flex flex-wrap items-center gap-3">{contactLabel(contact)} <OutreachStatusBadge status={contact.status} /> {unsubscribed && <UnsubscribedChip />}</span>}
        description={[person, CATEGORY_LABELS[contact.category], contact.district, contact.email].filter(Boolean).join(" · ")}
        back={{ href: "/admin/outreach", label: "Alle Kontakte" }}
      />
      <OutreachNav active="/admin/outreach" />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          <Card title="Status"><StatusPicker id={contact.id} status={contact.status} /></Card>
          <Card title="Gesendete Mails" description={TRACKING_NOTE}>
            {mine.length === 0 ? (
              <p className="text-[14px] text-ink-muted">Noch keine Mail an diesen Kontakt.</p>
            ) : (
              <Table className="border-0">
                <thead><tr><Th>Vorlage</Th><Th>Status</Th><Th>Zeitpunkt</Th><Th>Tracking</Th></tr></thead>
                <tbody>
                  {mine.map((s) => (
                    <tr key={s.id}>
                      <Td>
                        <p className="font-semibold">{s.templateName}{s.kind === "followup" && <span className="ml-1 text-[12px] font-normal text-ink-muted">(Nachfassen)</span>}</p>
                        {s.subject && <p className="text-[12px] text-ink-muted">{s.subject}</p>}
                        {(s.error || s.reason) && <p className="text-[12px] text-danger">{s.error ?? s.reason}</p>}
                      </Td>
                      <Td className="whitespace-nowrap">{SEND_STATUS_LABELS[s.status]}{s.provider === "console" && <span className="text-[12px] text-ink-muted"> (nur Log)</span>}</Td>
                      <Td className="whitespace-nowrap text-[13px] text-ink-muted">{viennaDateTime(new Date(s.sentAt ?? s.scheduledFor))}</Td>
                      <Td className="text-[13px]">
                        <TrackingChips opened={s.opens > 0} clicked={s.clicks.length > 0} />
                        {s.opens > 0 && <p className="text-[12px] text-ink-muted">{s.opens}× geöffnet (ungefähr)</p>}
                        {s.clicks.length > 0 && <p className="text-[12px] text-ink-muted">{s.clicks.length}× geklickt</p>}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          <Card title="Verlauf">
            {history.length === 0 ? <p className="text-[14px] text-ink-muted">Noch kein Eintrag.</p> : (
              <ol className="space-y-3">
                {history.map((e, i) => {
                  const Icon = ICONS[e.type] ?? Pencil;
                  return (
                    <li key={`${e.at}-${i}`} className="flex gap-3">
                      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-ivory-100 text-forest"><Icon className="size-3.5" aria-hidden /></span>
                      <div className="min-w-0">
                        <p className="text-[14px] leading-snug text-ink">{e.text}</p>
                        <p className="text-[12px] text-ink-soft">{viennaDateTime(new Date(e.at))}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
          <Card title="Daten bearbeiten"><ContactForm contact={contact} /></Card>
        </div>
        <aside className="space-y-6">
          <Card title="Aktionen"><ContactDangerZone id={contact.id} email={contact.email} unsubscribed={unsubscribed} /></Card>
          <Card title="Notizen"><NotesPanel id={contact.id} notes={contact.noteEntries} /></Card>
          <Card title="Kontakt">
            <dl className="space-y-2 text-[14px]">
              {contact.phone && <div><dt className="text-[12px] text-ink-muted">Telefon</dt><dd><a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="text-forest">{contact.phone}</a></dd></div>}
              <div><dt className="text-[12px] text-ink-muted">E-Mail</dt><dd className="break-all"><a href={`mailto:${contact.email}`} className="text-forest">{contact.email}</a></dd></div>
              {contact.website && <div><dt className="text-[12px] text-ink-muted">Website</dt><dd className="break-all"><a href={contact.website} target="_blank" rel="noreferrer noopener" className="text-forest">{contact.website.replace(/^https?:\/\//, "")}</a></dd></div>}
              {contact.tags.length > 0 && <div><dt className="text-[12px] text-ink-muted">Tags</dt><dd>{contact.tags.join(", ")}</dd></div>}
              {contact.notes && <div><dt className="text-[12px] text-ink-muted">Notiz</dt><dd className="whitespace-pre-line">{contact.notes}</dd></div>}
              <div><dt className="text-[12px] text-ink-muted">Angelegt</dt><dd>{viennaDateTime(new Date(contact.createdAt))}</dd></div>
            </dl>
          </Card>
        </aside>
      </div>
    </>
  );
}
