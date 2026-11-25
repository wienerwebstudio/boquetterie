import { foundViaLabel } from "@/lib/found-via";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Bike, CreditCard, Wallet, Flower2, History, MapPin, RefreshCw, Send, Star, StickyNote, Store } from "lucide-react";
import { getOrderById, getPartners, getSettings } from "@/lib/cms";
import { partnerMailAddresses } from "@/lib/mail";
import { withEffectivePartner } from "@/lib/partners";
import { formatDateLong, formatDateTime, formatPrice } from "@/lib/format";
import { Banner, Card, PageHeader } from "@/components/admin/controls";
import { StatusBadge } from "@/components/admin/status-badge";
import { CourierForm, InternalNoteForm, LineBudgetForm, OrderStatusForm, PartnerForm, ResendMailsForm, ReviewRequestForm } from "@/components/admin/order-forms";
import { deliveredAt, getReviewRequestStatus, MAX_DAYS_AFTER_DELIVERY, MIN_DAYS_AFTER_DELIVERY } from "@/lib/mail/review-requests";
import { courierEnabled } from "@/lib/courier";
import { getFloristBudgets, EMPTY_BUDGETS } from "@/lib/florist-budget";
import { lineCost, orderCost } from "@/lib/order-metrics";
import { isSelfDeliveryDay } from "@/lib/delivery";
import { RIDERX_STATUS_LABELS } from "@/lib/courier/riderx-core";
import { PAYMENT_LABELS, PAYMENT_STATUS_LABELS, customerName, orderLanguage, recipientName, statusLabel, isUnpaidOrder } from "@/components/admin/order-utils";

export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b border-dashed border-[#efebe4] py-2 text-[14px] last:border-b-0">
      <dt className="text-[#5f5c56]">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [found, settings, partners, budgets] = await Promise.all([getOrderById(decodeURIComponent(id)), getSettings(), getPartners(true), getFloristBudgets().catch(() => EMPTY_BUDGETS)]);
  if (!found) notFound();
  const order = withEffectivePartner(found);
  const needsPartner = order.payment.status === "paid" && order.status !== "cancelled" && !((order.partner?.sentAt || order.partner?.manual) && !order.partner.cancelSentAt);
  const review = await getReviewRequestStatus(order.id);
  const deliveredOn = order.status === "delivered" ? deliveredAt(order) : null;
  const cronActive = Boolean(process.env.CRON_SECRET);

  const r = order.recipient;
  const selfDelivery = isSelfDeliveryDay(settings, order.delivery.date);
  const linesTotal = order.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  // Partner budget (purchase price, net) – what the florist may spend.
  const budget = orderCost(order);
  const goods = order.totals.total - order.totals.delivery;
  const budgetRows = order.lines.map((l) => ({
    name: l.custom ? l.productName : `${l.productName} (${l.sizeLabel})`,
    quantity: l.quantity,
    value: l.floristBudget,
    suggested: l.custom ? undefined : budgets.products[l.productId]?.[l.sizeId],
    extras: l.extras.map((e) => ({ name: e.name, quantity: e.quantity, value: e.floristBudget, suggested: budgets.extras[e.extraId] })),
  }));

  return (
    <>
      <PageHeader
        back={{ href: "/admin/bestellungen", label: "Bestellungen" }}
        title={<span className="flex flex-wrap items-center gap-3">Bestellung {order.id} <StatusBadge status={order.status} label={statusLabel(settings, order.status)} /></span>}
        description={`Eingegangen am ${formatDateTime(order.createdAt)} · Tracking-Token ${order.token}`}
      />

      {isUnpaidOrder(order) && (
        <Banner tone="error" className="mb-5">
          <strong>Nicht bezahlt.</strong> Die Zahlung wurde abgebrochen oder nicht abgeschlossen – für diese Bestellung nichts binden und keinen Fahrer buchen. Kund:in und Partner haben keine Mail bekommen.
        </Banner>
      )}
      {needsPartner && order.offerId && (
        <Banner tone="info" className="mb-5">
          <strong>Individuelles Angebot <Link href={`/admin/angebote/${order.offerId}`} className="underline underline-offset-4">{order.offerId}</Link>.</strong> Es wird weder ein Partner noch ein Kurier automatisch beauftragt – Ware und Zustellung organisiert ihr selbst. Bei Bedarf rechts einen Partner wählen oder den Kurier von Hand buchen.
        </Banner>
      )}
      {needsPartner && !order.offerId && (
        <Banner tone="warn" className="mb-5">
          <strong>Noch keinem Partner zugeordnet.</strong> Niemand bindet diesen Strauß, bis ihr rechts unter „Partner“ eine Floristik wählt und den Auftrag sendet.
        </Banner>
      )}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card title="Positionen" accent="rose" icon={Flower2}>
            <ul className="divide-y divide-line">
              {order.lines.map((line, i) => (
                <li key={i} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[#f3efe8] ring-1 ring-black/5">
                    {line.image && <Image src={line.image} alt="" fill sizes="64px" className="object-cover" unoptimized />}
                  </div>
                  <div className="min-w-0 flex-1 text-[14px]">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{line.quantity} × {line.productName} <span className="font-normal text-ink-muted">({line.custom ? "individuell" : line.sizeLabel}{line.stems ? ` · ${line.stems} Stiele` : ""}{line.color ? ` · Farbe ${line.color}` : ""})</span></p>
                      <p className="whitespace-nowrap font-semibold">{formatPrice(line.unitPrice * line.quantity)}</p>
                    </div>
                    {(() => {
                      const c = lineCost(line);
                      const missingExtra = line.extras.some((x) => x.floristBudget === undefined);
                      return c === undefined ? (
                        <p className="mt-1 inline-flex rounded-full bg-[#fdecea] px-2.5 py-0.5 text-[12.5px] font-semibold text-[#b42318]" data-testid="line-budget">Partner-Budget: nicht hinterlegt</p>
                      ) : (
                        <p className="mt-1 inline-flex rounded-full bg-[#fff4dc] px-2.5 py-0.5 text-[12.5px] font-semibold text-[#8a5300]" data-testid="line-budget">
                          Partner-Budget: {formatPrice(c)}{line.quantity > 1 ? ` (${line.quantity} × ${formatPrice(line.floristBudget!)})` : ""}{missingExtra ? " · Extra ohne Budget" : ""}
                        </p>
                      );
                    })()}
                    {line.extras.length > 0 && (
                      <ul className="mt-1 text-[13px] text-ink-muted">
                        {line.extras.map((x) => (
                          <li key={x.extraId}>+ {x.quantity} × {x.name} ({formatPrice(x.unitPrice * x.quantity)})</li>
                        ))}
                      </ul>
                    )}
                    {line.description && <p className="mt-1 whitespace-pre-line text-[13px] text-ink-muted">{line.description}</p>}
                    {line.floristNote && (
                      <p className="mt-2 rounded-lg border-l-[3px] border-[#0f9466] bg-[#f0faf5] px-3 py-2 text-[13px] text-ink"><span className="font-semibold">Wunsch an die Floristik:</span> {line.floristNote}</p>
                    )}
                    {line.message && (
                      <blockquote className="mt-2 rounded-lg border-l-[3px] border-[#d6406d] bg-[#fdf3f6] px-3 py-2 text-[13px] italic text-ink">
                        „{line.message}“
                        <span className="mt-1 block not-italic text-ink-soft">{line.anonymous ? "Ohne Absender" : line.senderName ? `Absender: ${line.senderName}` : ""}</span>
                      </blockquote>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <dl className="mt-4 border-t border-line pt-3 text-[14px]">
              <div className="flex justify-between py-1"><dt className="text-ink-muted">Sträuße</dt><dd>{formatPrice(linesTotal)}</dd></div>
              <div className="flex justify-between py-1"><dt className="text-ink-muted">Extras</dt><dd>{formatPrice(order.totals.extras)}</dd></div>
              <div className="flex justify-between py-1"><dt className="text-ink-muted">Zwischensumme</dt><dd>{formatPrice(order.totals.subtotal)}</dd></div>
              <div className="flex justify-between py-1"><dt className="text-ink-muted">Lieferung</dt><dd>{formatPrice(order.totals.delivery)}</dd></div>
              {order.totals.discount > 0 && (
                <div className="flex justify-between py-1"><dt className="text-ink-muted">Rabatt{order.coupon ? ` (${order.coupon.code})` : ""}</dt><dd>−{formatPrice(order.totals.discount)}</dd></div>
              )}
              <div className="mt-2 flex justify-between rounded-xl bg-[linear-gradient(90deg,#fde8ee,#fff5f0)] px-3 py-2.5 text-[16px] font-bold"><dt>Gesamt</dt><dd className="tabular-nums text-[#a92a52]">{formatPrice(order.totals.total)}</dd></div>
              <div className="mt-2 flex justify-between px-3 py-1"><dt className="font-semibold text-[#8a5300]">Partner-Budget gesamt</dt><dd className="font-semibold tabular-nums text-[#8a5300]" data-testid="order-budget">{budget.complete ? formatPrice(budget.cost) : budget.cost > 0 ? `${formatPrice(budget.cost)} (unvollständig)` : "nicht hinterlegt"}</dd></div>
              {budget.complete && <div className="flex justify-between px-3 py-1 text-[13px]"><dt className="text-ink-muted">Bleibt (Ware − Budget, vor Kurier/Gebühren)</dt><dd className="tabular-nums">{formatPrice(goods - budget.cost)}</dd></div>}
            </dl>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card title="Empfänger:in & Lieferung" accent="teal" icon={MapPin}>
              <dl>
                <Row label="Name">{recipientName(order)}{r.company ? <div className="text-ink-muted">{r.company}</div> : null}</Row>
                <Row label="Adresse">{r.street} {r.houseNumber}{r.addition ? `, ${r.addition}` : ""}<br />{r.zip} {r.city}</Row>
                <Row label="Telefon"><a href={`tel:${r.phone}`} className="text-[#0a6644] underline-offset-4 hover:underline">{r.phone}</a></Row>
                <Row label="Lieferdatum">{order.delivery.none ? <strong>Keine Lieferung – nach Absprache</strong> : <strong>{formatDateLong(order.delivery.date)}</strong>}</Row>
                {order.delivery.windowLabel && <Row label="Zeitfenster">{order.delivery.windowLabel}</Row>}
                <Row label="Zustellung">{selfDelivery ? <strong>Selbst ausliefern</strong> : courierEnabled() ? "Fahrer (RiderX)" : "Fahrer – von Hand buchen"}</Row>
                <Row label="Gebiet">{order.delivery.zoneName} · {formatPrice(order.delivery.fee)}</Row>
                {order.delivery.note && <Row label="Hinweis">{order.delivery.note}</Row>}
              </dl>
            </Card>
            <Card title="Kund:in & Zahlung" accent="sky" icon={CreditCard}>
              <dl>
                <Row label="Name">{customerName(order)}</Row>
                <Row label="E-Mail"><a href={`mailto:${order.customer.email}`} className="text-[#0a6644] underline-offset-4 hover:underline">{order.customer.email}</a></Row>
                <Row label="Telefon">{order.customer.phone}</Row>
                {orderLanguage(order) && <Row label="Sprache">bestellt auf {orderLanguage(order)} – Kundenmails gehen in dieser Sprache raus</Row>}
                <Row label="Zahlungsart">{PAYMENT_LABELS[order.payment.method] ?? order.payment.method}</Row>
                <Row label="Zahlungsstatus">{PAYMENT_STATUS_LABELS[order.payment.status] ?? order.payment.status}</Row>
                {order.payment.reference && <Row label="Referenz"><code className="text-[13px]">{order.payment.reference}</code></Row>}
                {order.foundVia && <Row label="Gefunden über">{foundViaLabel(order.foundVia)}</Row>}
                {order.coupon && <Row label="Gutschein">{order.coupon.code} (−{formatPrice(order.coupon.discount)})</Row>}
                {order.offerId && <Row label="Angebot"><Link href={`/admin/angebote/${order.offerId}`} className="text-[#0a6644] underline-offset-4 hover:underline">{order.offerId}</Link></Row>}
                {order.billing && <Row label="Rechnung">{[order.billing.company, order.billing.name, order.billing.street, `${order.billing.zip} ${order.billing.city}`, order.billing.country, order.billing.vatId ? `UID ${order.billing.vatId}` : ""].filter(Boolean).join(", ")}</Row>}
              </dl>
            </Card>
          </div>

          <Card title="Verlauf" accent="violet" icon={History}>
            <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-[#e2dbf9]">
              {[...order.history].reverse().map((h, i) => (
                <li key={i} className="relative flex flex-wrap items-start gap-3 pl-6 text-[14px]">
                  <span className={`absolute left-0 top-1.5 size-[11px] rounded-full ring-4 ring-white ${i === 0 ? "bg-[#7c4ff0]" : "bg-[#c7b5fc]"}`} aria-hidden />
                  <span className="w-36 shrink-0 text-[#5f5c56]">{formatDateTime(h.at)}</span>
                  <StatusBadge status={h.status} label={statusLabel(settings, h.status)} />
                  {h.note && <span className="basis-full text-ink-muted sm:basis-auto">{h.note}</span>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-5">
          <Card accent="emerald" icon={Store} title="Partner" description="Welche Floristik bindet diesen Strauß. Erst mit „Auftrag senden“ bekommt der Partner die Mail.">
            <dl className="mb-4 text-[14px]">
              <Row label="Partner">{order.partner ? order.partner.name : <span className="font-semibold text-burgundy">Noch keiner</span>}</Row>
              {order.partner?.manual && !order.partner.sentAt && <Row label="Zuordnung">Nachträglich in der <Link href={`/admin/partner-abrechnung/${encodeURIComponent(order.partner.id)}`} className="underline underline-offset-4">Partner-Abrechnung</Link> – ohne Auftragsmail{order.partner.confirmedAt ? `, als bestätigt gezählt (${formatDateTime(order.partner.confirmedAt)})` : ""}</Row>}
              {order.partner?.sentAt && <Row label="Auftrag gesendet">{formatDateTime(order.partner.sentAt)}{order.partner.sentTo?.length ? <div className="text-[12.5px] text-ink-muted">{order.partner.sentTo.join(", ")}</div> : null}</Row>}
              {order.partner?.sentAt && !order.partner.cancelSentAt && (
                <Row label="Bestätigt">{!order.partner.confirmedAt && order.partner.reminders?.length ? <div className="text-[12.5px] text-ink-muted">{order.partner.reminders.length} Erinnerung(en) gesendet, zuletzt {formatDateTime(order.partner.reminders[order.partner.reminders.length - 1])}</div> : null}{order.partner.confirmedAt ? <span className="font-semibold text-[#0a6644]">Ja, {formatDateTime(order.partner.confirmedAt)}</span> : order.partner.confirmToken ? <span className="font-semibold text-burgundy">Noch nicht – ggf. anrufen</span> : <span className="text-ink-muted">Ohne Bestätigungslink gesendet</span>}</Row>
              )}
              {(order.partner ? order.partner.note : order.floristNote) && <Row label="Hinweis an Floristik"><span className="whitespace-pre-line font-semibold text-[#9a3412]">{order.partner ? order.partner.note : order.floristNote}</span>{!order.partner && <div className="text-[12px] font-normal text-ink-muted">aus dem Angebot – wird beim Zuordnen mitgesendet</div>}</Row>}
              {order.partner?.cancelSentAt && <Row label="Storno gesendet">{formatDateTime(order.partner.cancelSentAt)}</Row>}
            </dl>
            <PartnerForm
              orderId={order.id}
              partners={partners.map((p) => ({ id: p.id, name: p.name, reachable: partnerMailAddresses(p).length > 0 }))}
              current={order.partner ? { id: order.partner.id, name: order.partner.name, sent: Boolean(order.partner.sentAt), cancelled: Boolean(order.partner.cancelSentAt) } : null}
              canAssign={order.payment.status === "paid" && order.status !== "cancelled"}
              note={order.partner ? order.partner.note : order.floristNote}
            />
            {partners.length === 0 && <p className="mt-3 text-[13px] text-ink-muted">Noch kein aktiver Partner – unter <Link href="/admin/partner" className="text-[#0a6644] underline-offset-4 hover:underline">Partner</Link> anlegen.</p>}
          </Card>
          <Card accent="amber" icon={Wallet} title="Partner-Budget" description="Was der Partner pro Strauß maximal ausgeben darf (Einkauf netto). Steht im Auftrag an den Partner.">
            <LineBudgetForm orderId={order.id} rows={budgetRows} />
          </Card>
          <Card title="Status ändern" accent="amber" icon={RefreshCw}>
            <OrderStatusForm orderId={order.id} current={order.status} statuses={settings.orderStatuses} canRequestReview={Boolean(order.customer.email) && !review.sentAt && !review.submittedAt} />
          </Card>
          {courierEnabled() && (
            <Card accent="coral" icon={Bike} title="Kurier (RiderX)" description={selfDelivery ? "Selbst ausliefern – an diesem Tag wird kein Fahrer automatisch gebucht. Bei Bedarf hier von Hand buchen." : "Kostenlos stornierbar bis 30 Min. vor der Abholung."}>
              <dl className="mb-4 text-[14px]">
                <Row label="Status">{order.courier ? (order.courier.status === "failed" ? "Nicht gebucht" : order.courier.status === "booking" ? "Wird gebucht …" : RIDERX_STATUS_LABELS[order.courier.status] ?? order.courier.status) : "Noch nicht gebucht"}</Row>
                {order.courier?.deliveryId && <Row label="RiderX-Nr.">#{order.courier.deliveryId}</Row>}
                {order.courier?.pickupAt && <Row label="Abholung">{formatDateTime(order.courier.pickupAt)}</Row>}
                {order.courier?.error && <Row label="Fehler"><span className="text-burgundy">{order.courier.error}</span></Row>}
              </dl>
              <CourierForm
                orderId={order.id}
                canBook={order.payment.status === "paid" && order.status !== "cancelled" && (!order.courier || ["failed", "cancel"].includes(order.courier.status))}
                canCancel={Boolean(order.courier?.deliveryId) && !["cancel", "failed", "pickup", "late_pickup", "completed", "late_completed"].includes(order.courier?.status ?? "")}
              />
            </Card>
          )}
          {order.payment.status === "paid" && (
            <Card accent="sky" icon={Send} title="Mails erneut senden" description="Kundenbestellung oder Bestelleingang, falls eine Mail nicht angekommen ist. Den Partner-Auftrag sendet ihr oben unter „Partner“.">
              <ResendMailsForm orderId={order.id} customerEmail={order.customer.email} />
            </Card>
          )}
          <Card accent="rose" icon={Star} title="Bewertungsanfrage" description={`Mail „Wie war der Strauß?“ mit Link zum Bewertungsformular. Automatisch einmalig ${MIN_DAYS_AFTER_DELIVERY}–${MAX_DAYS_AFTER_DELIVERY} Tage nach der Zustellung.`}>
            <dl className="mb-4 text-[14px]">
              <Row label="Zugestellt">{deliveredOn ? formatDateTime(deliveredOn) : <span className="text-burgundy">Noch nicht</span>}</Row>
              <Row label="Gesendet">
                {review.sentAt
                  ? `${formatDateTime(review.sentAt)} (${review.sentBy === "admin" ? "manuell" : review.sentBy === "cron" ? "automatisch" : "gesendet"}${review.sendCount > 1 ? `, ${review.sendCount}×` : ""})`
                  : "Noch nicht"}
              </Row>
              <Row label="Bewertet">
                {review.submittedAt
                  ? <>Ja, am {formatDateTime(review.submittedAt)}{review.pendingSubmissionId && <> · <Link href="/admin/bewertungen/eingereicht" className="text-[#0a6644] underline-offset-4 hover:underline">wartet auf Freigabe</Link></>}</>
                  : "Noch nicht"}
              </Row>
            </dl>
            {!cronActive && (
              <p className="mb-4 rounded-lg border border-[#e7e2d9] bg-[#f6f4ef] px-3 py-2 text-[13px] text-[#5f5c56]">
                Automatischer Versand ist nicht aktiv: <code>CRON_SECRET</code> fehlt in den Umgebungsvariablen (siehe docs/MAIL.md).
              </p>
            )}
            {!order.customer.email ? (
              <p className="text-[13px] text-ink-muted">Keine E-Mail-Adresse hinterlegt – keine Anfrage möglich.</p>
            ) : order.status === "cancelled" ? (
              <p className="text-[13px] text-ink-muted">Storniert – keine Anfrage.</p>
            ) : review.submittedAt ? (
              <p className="text-[13px] text-ink-muted">Bereits bewertet – keine weitere Anfrage nötig.</p>
            ) : (
              <>
                {order.status !== "delivered" && (
                  <Banner tone="warn" className="mb-3">Noch nicht als „Zugestellt“ markiert. Die Kund:in kann erst bewerten, sobald der Status „Zugestellt“ ist.</Banner>
                )}
                <ReviewRequestForm orderId={order.id} customerEmail={order.customer.email} delivered={order.status === "delivered"} lastSentLabel={review.sentAt ? formatDateTime(review.sentAt) : null} />
              </>
            )}
          </Card>
          <Card accent="violet" icon={StickyNote} title="Interne Notiz" description="Nur für das Team sichtbar.">
            <InternalNoteForm orderId={order.id} note={order.internalNote} />
          </Card>
        </div>
      </div>
    </>
  );
}
