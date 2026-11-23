import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Flower2, History, Mail, MapPin, Receipt, Send, StickyNote, UserRound } from "lucide-react";
import { getOfferById, getOrderById, getSettings } from "@/lib/cms";
import { getLocalNow } from "@/lib/delivery";
import { offerStatus, offerTimeLabel, offerTotals } from "@/lib/offers-core";
import { offerUrl, publicSiteUrl } from "@/lib/offers";
import { renderOfferMail } from "@/lib/mail";
import { formatDateLong, formatDateTime, formatPrice } from "@/lib/format";
import { LOCALE_INFO, isLocale } from "@/i18n/config";
import { Banner, Card, PageHeader } from "@/components/admin/controls";
import { OfferStatusBadge } from "@/components/admin/offer-status";
import { OfferActions } from "@/components/admin/offer-actions";

export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b border-dashed border-[#efebe4] py-2 text-[14px] last:border-b-0">
      <dt className="text-[#5f5c56]">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

export default async function OfferDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [offer, settings] = await Promise.all([getOfferById(decodeURIComponent(id)), getSettings()]);
  if (!offer) notFound();
  const status = offerStatus(offer, getLocalNow(settings.timezone).date);
  const totals = offerTotals(offer);
  const url = offerUrl(offer, await publicSiteUrl());
  const order = offer.orderId ? await getOrderById(offer.orderId) : null;
  const mail = await renderOfferMail(offer, url);
  const r = offer.recipient;
  const language = isLocale(offer.locale) ? LOCALE_INFO[offer.locale].name : offer.locale;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/angebote", label: "Angebote" }}
        title={<span className="flex flex-wrap items-center gap-3">Angebot {offer.id} <OfferStatusBadge status={status} /></span>}
        description={`Erstellt am ${formatDateTime(offer.createdAt)} · Sprache ${language} · gültig bis ${formatDateLong(offer.validUntil)}`}
      />
      {offer.requestId && <p className="mb-4 text-[13.5px] text-[#5f5c56]">Erstellt aus <Link href={`/admin/anfragen/${offer.requestId}`} className="font-semibold text-[#0a6644] underline-offset-4 hover:underline">Anfrage {offer.requestId}</Link></p>}
      {sp.gesendet === "1" && <Banner tone="success" className="mb-5">Gespeichert und an {offer.customer.email} gesendet.</Banner>}
      {sp.gespeichert === "1" && <Banner tone="success" className="mb-5">Gespeichert{offer.sentAt ? " – zum Aktualisieren bei der Kund:in bitte erneut senden" : ""}.</Banner>}
      {status === "paid" && order && (
        <Banner tone="success" className="mb-5">
          <strong>Bezahlt</strong>{offer.paidAt ? ` am ${formatDateTime(offer.paidAt)}` : ""} – Bestellung <Link href={`/admin/bestellungen/${order.id}`} className="font-semibold underline underline-offset-4">{order.id}</Link>. Weiter wie bei jeder Bestellung (Partner zuordnen, Kurier …).
        </Banner>
      )}
      {status === "expired" && <Banner tone="warn" className="mb-5">Abgelaufen – zum Verlängern „Gültig bis“ ändern und erneut senden.</Banner>}
      {status !== "paid" && order && order.payment.status === "pending" && <Banner tone="info" className="mb-5">Die Kund:in hat die Zahlung begonnen (Bestellung {order.id}, noch nicht bezahlt).</Banner>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <Card title="Positionen" accent="rose" icon={Flower2}>
            <ul className="divide-y divide-line">
              {offer.items.map((it) => (
                <li key={it.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[#f3efe8] ring-1 ring-black/5">
                    {it.image && <Image src={it.image} alt="" fill sizes="64px" className="object-cover" unoptimized />}
                  </div>
                  <div className="min-w-0 flex-1 text-[14px]">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{it.quantity} × {it.title} <span className="font-normal text-ink-muted">({it.kind === "custom" ? "frei" : it.sizeLabel})</span></p>
                      <p className="whitespace-nowrap font-semibold">{formatPrice(it.unitPrice * it.quantity)}</p>
                    </div>
                    {it.description && <p className="mt-1 whitespace-pre-line text-[13px] text-ink-muted">{it.description}</p>}
                    {it.floristBudget !== undefined && <p className="mt-1 text-[12.5px] text-ink-soft">Floristen-Budget {formatPrice(it.floristBudget)} / Stk.</p>}
                  </div>
                </li>
              ))}
            </ul>
            {offer.extras.length > 0 && (
              <ul className="mt-3 border-t border-line pt-3 text-[13.5px] text-ink-muted">
                {offer.extras.map((e) => <li key={e.extraId} className="flex justify-between"><span>+ {e.quantity} × {e.name}</span><span>{formatPrice(e.unitPrice * e.quantity)}</span></li>)}
              </ul>
            )}
            <dl className="mt-4 border-t border-line pt-3 text-[14px]">
              <div className="flex justify-between py-1"><dt className="text-ink-muted">Positionen</dt><dd>{formatPrice(totals.items)}</dd></div>
              <div className="flex justify-between py-1"><dt className="text-ink-muted">Extras</dt><dd>{formatPrice(totals.extras)}</dd></div>
              <div className="flex justify-between py-1"><dt className="text-ink-muted">Lieferung</dt><dd>{formatPrice(totals.delivery)}</dd></div>
              <div className="mt-2 flex justify-between rounded-xl bg-[linear-gradient(90deg,#fde8ee,#fff5f0)] px-3 py-2.5 text-[16px] font-bold"><dt>Gesamt</dt><dd className="tabular-nums text-[#a92a52]">{formatPrice(totals.total)}</dd></div>
            </dl>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card title="Lieferung" accent="teal" icon={CalendarClock}>
              <dl>
                {offer.delivery.date && <Row label="Datum"><strong>{formatDateLong(offer.delivery.date)}</strong></Row>}
                {!offer.delivery.enabled && <Row label="Art"><strong>Keine Lieferung</strong> – Abholung / nach Absprache</Row>}
                {offerTimeLabel(offer.delivery) && <Row label="Zeit">{offerTimeLabel(offer.delivery)}</Row>}
                {offer.delivery.enabled && <><Row label={r.kind === "meeting" ? "Treffpunkt" : "Adresse"}>{r.kind === "meeting" && r.addition ? <strong>{r.addition}<br /></strong> : null}{r.company ? <>{r.company}<br /></> : null}{r.street} {r.houseNumber}{r.kind !== "meeting" && r.addition ? `, ${r.addition}` : ""}<br />{r.zip} {r.city}</Row>
                <Row label="Empfänger:in">{r.firstName} {r.lastName}{r.phone && <div><a href={`tel:${r.phone}`} className="text-[#0a6644] underline-offset-4 hover:underline">{r.phone}</a></div>}</Row></>}
                {offer.delivery.note && <Row label="Hinweis">{offer.delivery.note}</Row>}
              </dl>
            </Card>
            <Card title="Kund:in" accent="sky" icon={UserRound}>
              <dl>
                <Row label="Name">{offer.customer.firstName} {offer.customer.lastName}</Row>
                <Row label="E-Mail"><a href={`mailto:${offer.customer.email}`} className="text-[#0a6644] underline-offset-4 hover:underline">{offer.customer.email}</a></Row>
                {offer.customer.phone && <Row label="Telefon">{offer.customer.phone}</Row>}
                <Row label="Sprache">{language}</Row>
                {offer.billing && <Row label="Rechnung">{[offer.billing.company, offer.billing.name, offer.billing.street, `${offer.billing.zip} ${offer.billing.city}`, offer.billing.country, offer.billing.vatId ? `UID ${offer.billing.vatId}` : ""].filter(Boolean).join(", ")}</Row>}
                {offer.viewedAt && <Row label="Angesehen">{formatDateTime(offer.viewedAt)}</Row>}
                {offer.sentAt && <Row label="Gesendet">{formatDateTime(offer.sentAt)}{(offer.sentCount ?? 0) > 1 ? ` (${offer.sentCount}×)` : ""}</Row>}
              </dl>
            </Card>
          </div>

          {(offer.floristNote || offer.internalNote || offer.greeting) && (
            <Card title="Hinweise" accent="violet" icon={StickyNote}>
              <dl>
                {offer.floristNote && <Row label="An Floristik"><span className="whitespace-pre-line font-semibold text-[#9a3412]">{offer.floristNote}</span></Row>}
                {offer.greeting && <Row label="Grußkarte">„{offer.greeting.message}“{offer.greeting.senderName ? ` – ${offer.greeting.senderName}` : ""}</Row>}
                {offer.internalNote && <Row label="Intern"><span className="whitespace-pre-line">{offer.internalNote}</span></Row>}
              </dl>
            </Card>
          )}

          <Card title="Mail-Vorschau" accent="amber" icon={Mail} description={`Betreff: ${mail.subject}`}>
            <iframe title="Vorschau der Angebots-Mail" srcDoc={mail.html} className="h-[900px] w-full rounded-lg border border-[#e7e2d9] bg-white" sandbox="" />
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Aktionen" accent="emerald" icon={Send}>
            <OfferActions id={offer.id} url={url} sent={Boolean(offer.sentAt)} live={offer.status === "sent"} editable={offer.status !== "paid" && offer.status !== "cancelled"} cancellable={offer.status !== "paid" && offer.status !== "cancelled"} customerEmail={offer.customer.email} />
          </Card>
          <Card title="Summe" accent="coral" icon={Receipt}>
            <p className="text-[28px] font-bold tabular-nums text-ink">{formatPrice(totals.total)}</p>
            <p className="mt-1 text-[13px] text-ink-muted">inkl. Lieferung · {MapPinLabel(offer.recipient.zip, offer.delivery.zoneName)}</p>
          </Card>
          <Card title="Verlauf" accent="violet" icon={History}>
            <ol className="space-y-3 text-[13.5px]">
              {[...offer.history].reverse().map((h, i) => (
                <li key={i} className="flex flex-col"><span className="text-[12px] text-[#5f5c56]">{formatDateTime(h.at)}</span><span>{h.note}</span></li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}

function MapPinLabel(zip: string, zone?: string) {
  return (
    <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{zip}{zone ? ` · ${zone}` : ""}</span>
  );
}
