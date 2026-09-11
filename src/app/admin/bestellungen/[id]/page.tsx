import { notFound } from "next/navigation";
import Image from "next/image";
import { getOrderById, getSettings } from "@/lib/cms";
import { formatDateLong, formatDateTime, formatPrice } from "@/lib/format";
import { Card, PageHeader } from "@/components/admin/controls";
import { StatusBadge } from "@/components/admin/status-badge";
import { InternalNoteForm, OrderStatusForm } from "@/components/admin/order-forms";
import { PAYMENT_LABELS, PAYMENT_STATUS_LABELS, customerName, recipientName, statusLabel } from "@/components/admin/order-utils";

export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-1.5 text-[14px]">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, settings] = await Promise.all([getOrderById(decodeURIComponent(id)), getSettings()]);
  if (!order) notFound();

  const r = order.recipient;
  const linesTotal = order.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/bestellungen", label: "Bestellungen" }}
        title={<span className="flex flex-wrap items-center gap-3">Bestellung {order.id} <StatusBadge status={order.status} label={statusLabel(settings, order.status)} /></span>}
        description={`Eingegangen am ${formatDateTime(order.createdAt)} · Tracking-Token ${order.token}`}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card title="Positionen">
            <ul className="divide-y divide-line">
              {order.lines.map((line, i) => (
                <li key={i} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-ivory-200">
                    {line.image && <Image src={line.image} alt="" fill sizes="64px" className="object-cover" unoptimized />}
                  </div>
                  <div className="min-w-0 flex-1 text-[14px]">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{line.quantity} × {line.productName} <span className="font-normal text-ink-muted">({line.sizeLabel})</span></p>
                      <p className="whitespace-nowrap font-semibold">{formatPrice(line.unitPrice * line.quantity)}</p>
                    </div>
                    {line.extras.length > 0 && (
                      <ul className="mt-1 text-[13px] text-ink-muted">
                        {line.extras.map((x) => (
                          <li key={x.extraId}>+ {x.quantity} × {x.name} ({formatPrice(x.unitPrice * x.quantity)})</li>
                        ))}
                      </ul>
                    )}
                    {line.message && (
                      <blockquote className="mt-2 rounded-md bg-ivory-100 px-3 py-2 text-[13px] italic text-ink">
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
              <div className="flex justify-between border-t border-line py-2 text-[15px] font-semibold"><dt>Gesamt</dt><dd>{formatPrice(order.totals.total)}</dd></div>
            </dl>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card title="Empfänger:in & Lieferung">
              <dl>
                <Row label="Name">{recipientName(order)}{r.company ? <div className="text-ink-muted">{r.company}</div> : null}</Row>
                <Row label="Adresse">{r.street} {r.houseNumber}{r.addition ? `, ${r.addition}` : ""}<br />{r.zip} {r.city}</Row>
                <Row label="Telefon"><a href={`tel:${r.phone}`} className="text-forest underline-offset-4 hover:underline">{r.phone}</a></Row>
                <Row label="Lieferdatum"><strong>{formatDateLong(order.delivery.date)}</strong></Row>
                {order.delivery.windowLabel && <Row label="Zeitfenster">{order.delivery.windowLabel}</Row>}
                <Row label="Gebiet">{order.delivery.zoneName} · {formatPrice(order.delivery.fee)}</Row>
                {order.delivery.note && <Row label="Hinweis">{order.delivery.note}</Row>}
              </dl>
            </Card>
            <Card title="Kund:in & Zahlung">
              <dl>
                <Row label="Name">{customerName(order)}</Row>
                <Row label="E-Mail"><a href={`mailto:${order.customer.email}`} className="text-forest underline-offset-4 hover:underline">{order.customer.email}</a></Row>
                <Row label="Telefon">{order.customer.phone}</Row>
                <Row label="Zahlungsart">{PAYMENT_LABELS[order.payment.method] ?? order.payment.method}</Row>
                <Row label="Zahlungsstatus">{PAYMENT_STATUS_LABELS[order.payment.status] ?? order.payment.status}</Row>
                {order.payment.reference && <Row label="Referenz"><code className="text-[13px]">{order.payment.reference}</code></Row>}
                {order.coupon && <Row label="Gutschein">{order.coupon.code} (−{formatPrice(order.coupon.discount)})</Row>}
              </dl>
            </Card>
          </div>

          <Card title="Verlauf">
            <ol className="space-y-3">
              {[...order.history].reverse().map((h, i) => (
                <li key={i} className="flex flex-wrap items-start gap-3 text-[14px]">
                  <span className="w-36 shrink-0 text-ink-muted">{formatDateTime(h.at)}</span>
                  <StatusBadge status={h.status} label={statusLabel(settings, h.status)} />
                  {h.note && <span className="basis-full text-ink-muted sm:basis-auto">{h.note}</span>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Status ändern">
            <OrderStatusForm orderId={order.id} current={order.status} statuses={settings.orderStatuses} />
          </Card>
          <Card title="Interne Notiz" description="Nur für das Team sichtbar.">
            <InternalNoteForm orderId={order.id} note={order.internalNote} />
          </Card>
        </div>
      </div>
    </>
  );
}
