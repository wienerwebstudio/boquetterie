import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, FileSignature, History, Image as ImageIcon, Mail, MessageCircle, MessageSquareText, Phone, StickyNote, UserRound } from "lucide-react";
import { getContactMessages, getCustomRequestById } from "@/lib/cms";
import { contactStatus } from "@/lib/custom-requests";
import { BUDGET_LABELS, telLink, whatsappLink, type CustomRequestBudget } from "@/lib/custom-requests-core";
import { formatDateLong, formatDateTime } from "@/lib/format";
import { LOCALE_INFO, isLocale } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/admin/controls";
import { RequestStatusBadge, RequestTypeBadge, TopicBadges } from "@/components/admin/request-status";
import { RequestStatusForm } from "@/components/admin/request-status-form";

export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b border-dashed border-[#efebe4] py-2 text-[14px] last:border-b-0">
      <dt className="text-[#5f5c56]">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

const LINK_BTN = "inline-flex h-9 items-center gap-2 rounded-md border border-forest px-4 text-[13px] font-semibold text-forest transition-colors hover:bg-forest hover:text-ivory";

function ContactLinks({ email, phone, subject }: { email: string; phone?: string; subject: string }) {
  const tel = telLink(phone);
  const wa = whatsappLink(phone);
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`mailto:${email}?subject=${encodeURIComponent(subject)}`} className={LINK_BTN}><Mail className="size-4" aria-hidden /> E-Mail</a>
      {tel && <a href={tel} className={LINK_BTN}><Phone className="size-4" aria-hidden /> Anrufen</a>}
      {wa && <a href={wa} target="_blank" rel="noreferrer" className={LINK_BTN} data-testid="whatsapp-link"><MessageCircle className="size-4" aria-hidden /> WhatsApp</a>}
    </div>
  );
}

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  if (id.startsWith("AF-")) return <RequestDetail id={id} />;
  const message = (await getContactMessages()).find((m) => m.id === id);
  if (!message) notFound();
  const status = contactStatus(message);
  return (
    <>
      <PageHeader
        back={{ href: "/admin/anfragen", label: "Anfragen" }}
        title={<span className="flex flex-wrap items-center gap-3"><RequestTypeBadge type="contact" /> {message.id} <RequestStatusBadge status={status} /></span>}
        description={`Kontaktformular · eingegangen am ${formatDateTime(message.createdAt)}`}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <Card title="Nachricht" accent="violet" icon={MessageSquareText}>
            <div className="mb-4"><TopicBadges tags={[message.subject]} type="contact" large /></div>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{message.message}</p>
          </Card>
          <Card title="Kund:in" accent="sky" icon={UserRound}>
            <dl>
              <Row label="Name">{message.name}</Row>
              <Row label="E-Mail">{message.email}</Row>
              {message.orderId && <Row label="Bestellung"><Link href={`/admin/bestellungen/${message.orderId}`} className="font-semibold text-[#0a6644] underline-offset-4 hover:underline">{message.orderId}</Link></Row>}
            </dl>
            <div className="mt-4"><ContactLinks email={message.email} subject={`Re: ${message.subject}`} /></div>
          </Card>
        </div>
        <aside className="space-y-5">
          <Card title="Bearbeitung" accent="amber" icon={StickyNote}>
            <RequestStatusForm id={message.id} status={status} note={message.note ?? ""} />
          </Card>
        </aside>
      </div>
    </>
  );
}

async function RequestDetail({ id }: { id: string }) {
  const r = await getCustomRequestById(id);
  if (!r) notFound();
  const language = isLocale(r.locale) ? (r.locale === "de" ? "Deutsch" : `${LOCALE_INFO[r.locale].name} (${r.locale})`) : r.locale;
  const when = [r.date ? formatDateLong(r.date) : "", r.time, r.flexible ? "flexibel" : ""].filter(Boolean).join(", ");

  return (
    <>
      <PageHeader
        back={{ href: "/admin/anfragen", label: "Anfragen" }}
        title={<span className="flex flex-wrap items-center gap-3"><RequestTypeBadge type="request" /> {r.id} <RequestStatusBadge status={r.status} /></span>}
        description={`Eingegangen am ${formatDateTime(r.createdAt)} · Sprache ${language}`}
        actions={r.offerId
          ? <Button href={`/admin/angebote/${r.offerId}`} size="sm" variant="outline" icon={<FileSignature className="size-4" aria-hidden />}>Angebot {r.offerId}</Button>
          : <Button href={`/admin/angebote/neu?anfrage=${encodeURIComponent(r.id)}`} size="sm" icon={<FileSignature className="size-4" aria-hidden />}>Angebot erstellen</Button>}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <Card title="Anfrage" accent="rose" icon={MessageSquareText}>
            {r.topics.length > 0 && <div className="mb-4" data-testid="request-topics"><TopicBadges tags={r.topics} type="request" large /></div>}
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink" data-testid="request-message">{r.message}</p>
          </Card>

          <Card title="Wunsch & Lieferung" accent="teal" icon={CalendarClock}>
            <dl>
              <Row label="Strauß aus dem Shop">{r.product ? <a href={`/produkt/${r.product.slug}`} target="_blank" rel="noreferrer" className="font-semibold text-[#0a6644] underline-offset-4 hover:underline">{r.product.name}</a> : "–"}</Row>
              <Row label="Wunschtermin">{when || "–"}</Row>
              <Row label="Lieferort">{r.place || "–"}</Row>
              <Row label="Budget">{r.budget ? BUDGET_LABELS[r.budget as CustomRequestBudget] ?? r.budget : "–"}</Row>
            </dl>
          </Card>

          {r.photo && (
            <Card title="Foto zur Inspiration" accent="violet" icon={ImageIcon}>
              <a href={r.photo.url} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- private /media URL: only the admin's browser (with its session cookie) may load it */}
                <img src={r.photo.url} alt={`Foto zur Anfrage ${r.id}`} width={r.photo.width} height={r.photo.height} className="h-auto max-h-[480px] w-auto max-w-full rounded-lg border border-[#e7e2d9]" data-testid="request-photo" />
              </a>
            </Card>
          )}

          <Card title="Kund:in" accent="sky" icon={UserRound}>
            <dl>
              <Row label="Name">{r.name}</Row>
              <Row label="E-Mail">{r.email}</Row>
              <Row label="Telefon/WhatsApp">{r.phone ?? "–"}</Row>
              <Row label="Einwilligung">{formatDateTime(r.consentAt)}</Row>
            </dl>
            <div className="mt-4"><ContactLinks email={r.email} phone={r.phone} subject={`Deine Anfrage ${r.id}`} /></div>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card title="Bearbeitung" accent="amber" icon={StickyNote}>
            <RequestStatusForm id={r.id} status={r.status} note={r.note ?? ""} />
          </Card>
          {r.history?.length > 0 && (
            <Card title="Verlauf" accent="emerald" icon={History}>
              <ol className="space-y-2 text-[13px]">
                {[...r.history].reverse().map((h, i) => (
                  <li key={i}><span className="text-[#5f5c56]">{formatDateTime(h.at)}</span> · {h.note}</li>
                ))}
              </ol>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
