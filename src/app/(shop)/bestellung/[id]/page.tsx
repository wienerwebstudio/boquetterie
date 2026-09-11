import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { timingSafeEqual } from "node:crypto";
import { CircleAlert, CircleCheck, Search } from "lucide-react";
import { getOrderById, getSettings } from "@/lib/cms";
import { ORDER_STATUS_FLOW, isNegativeStatus, publicOrderView } from "@/lib/orders";
import { isTestOrder } from "@/lib/payments";
import { formatDateLong, formatPrice, cn } from "@/lib/format";
import { routes } from "@/lib/urls";
import { Button } from "@/components/ui/button";
import { OrderTimeline } from "@/components/checkout/order-timeline";
import { GreetingCardPreview } from "@/components/checkout/greeting-card-preview";
import { OrderPlacedCleanup } from "@/components/checkout/order-placed-cleanup";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deine Bestellung",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function tokenMatches(expected: string, given: string) {
  if (!given || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

function NotFoundView() {
  return (
    <div className="container-x py-16 lg:py-24">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-ivory-200 text-forest"><Search className="size-6" strokeWidth={1.5} aria-hidden /></span>
        <h1 className="display-2 text-ink">Bestellung nicht gefunden</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
          Der Link ist unvollständig oder nicht mehr gültig. Mit deiner Bestellnummer und der E-Mail-Adresse aus der Bestellung kannst du den Status jederzeit abrufen.
        </p>
        <Button href={routes.tracking} size="lg" className="mt-8">Bestellung verfolgen</Button>
      </div>
    </div>
  );
}

export default async function OrderStatusPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.token === "string" ? sp.token : "";
  const isNew = sp.neu === "1";
  const raw = await getOrderById(decodeURIComponent(id).trim().toUpperCase());
  if (!raw || !tokenMatches(raw.token, token)) return <NotFoundView />;

  const [order, settings] = [publicOrderView(raw), await getSettings()];
  const definitions = settings.orderStatuses;
  const current = definitions.find((d) => d.key === order.status);
  const negative = isNegativeStatus(order.status);
  const testMode = isTestOrder(order);
  const providerName = order.payment.provider === "stripe" ? "Stripe" : order.payment.provider === "paypal" ? "PayPal" : null;
  const greeting = order.lines.find((l) => l.message || l.senderName || l.anonymous);
  const contactEmail = settings.brand.email.startsWith("[") ? null : settings.brand.email;
  const contactPhone = settings.brand.phone.startsWith("[") ? null : settings.brand.phone;

  const paymentLabel = {
    paid: `Zahlung bestätigt${testMode ? " (Testmodus)" : ""}`,
    pending: "Zahlung ausstehend",
    failed: "Zahlung fehlgeschlagen",
    refunded: "Zahlung erstattet",
  }[order.payment.status] ?? order.payment.status;
  const paymentTone = order.payment.status === "paid" ? "text-success" : order.payment.status === "pending" ? "text-warn" : order.payment.status === "refunded" ? "text-ink" : "text-danger";
  const paymentHint = testMode
    ? "Testmodus: Es wurde kein Betrag abgebucht."
    : order.payment.status === "pending"
      ? `Die Zahlung wird noch bestätigt${providerName ? ` – ${providerName} meldet uns das Ergebnis` : ""}. Bis dahin bleibt die Bestellung unverbindlich; lade die Seite in ein paar Minuten neu.`
      : order.payment.status === "failed"
        ? "Die Zahlung ist fehlgeschlagen oder wurde abgebrochen. Diese Bestellung wird nicht ausgeführt – bitte bestelle erneut."
        : order.payment.status === "refunded"
          ? "Der Betrag wurde erstattet. Je nach Bank kann die Gutschrift einige Tage dauern."
          : null;

  return (
    <div className="container-x py-10 lg:py-16">
      {/* Header */}
      <header className="mx-auto max-w-2xl text-center">
        {isNew ? (
          <>
            <OrderPlacedCleanup />
            <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-forest text-ivory animate-fade-in"><CircleCheck className="size-7" strokeWidth={1.5} aria-hidden /></span>
            <p className="eyebrow mb-3">Bestellung {order.id}</p>
            <h1 className="display-2 text-balance text-ink animate-fade-up">
              {order.payment.status === "pending" ? "Danke! Deine Bestellung ist eingegangen." : "Danke! Deine Bestellung ist bestätigt."}
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
              {order.payment.status === "pending"
                ? "Sobald die Zahlung bestätigt ist, binden wir den Strauß frisch am Liefertag. Diese Seite zeigt dir jederzeit den aktuellen Stand – speichere dir den Link."
                : "Wir binden den Strauß frisch am Liefertag. Diese Seite zeigt dir jederzeit den aktuellen Stand – speichere dir den Link."}
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow mb-3">Bestellung {order.id}</p>
            <h1 className="display-2 text-balance text-ink">{negative ? current?.label ?? "Status" : "Dein Strauß ist in guten Händen."}</h1>
          </>
        )}
        <p className="mt-4 text-[13px] text-ink-soft">Du findest diesen Link auch in deiner Bestellbestätigung per E-Mail.</p>
      </header>

      <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
        {/* Status */}
        <section aria-labelledby="status-title" className="rounded-lg border border-line bg-white/60 p-6 sm:p-8">
          <h2 id="status-title" className="mb-6 font-serif text-2xl text-ink">Status</h2>
          {negative ? (
            <div role="alert" className="flex gap-3 rounded-md border border-rose/40 bg-rose-100/60 p-4">
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-burgundy" aria-hidden />
              <div>
                <p className="font-semibold text-ink">{current?.label}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">{current?.description}</p>
                {order.status === "undeliverable" && <p className="mt-2 text-[14px] text-ink-muted">Wir melden uns bei dir unter {order.customer.email}.</p>}
              </div>
            </div>
          ) : (
            <OrderTimeline flow={ORDER_STATUS_FLOW} definitions={definitions} status={order.status} history={order.history} />
          )}
          <dl className="mt-8 grid gap-3 border-t border-line pt-6 text-[14px]">
            <div className="flex justify-between gap-4"><dt className="text-ink-muted">Zahlung</dt><dd className={cn("text-right font-semibold", paymentTone)}>{paymentLabel}</dd></div>
            {paymentHint && <p className="text-[12.5px] leading-relaxed text-ink-soft">{paymentHint}</p>}
          </dl>
        </section>

        {/* Delivery & recipient */}
        <section aria-labelledby="delivery-title" className="rounded-lg border border-line bg-white/60 p-6 sm:p-8">
          <h2 id="delivery-title" className="mb-6 font-serif text-2xl text-ink">Lieferung</h2>
          <dl className="grid gap-5 text-[14.5px]">
            <div>
              <dt className="eyebrow mb-1">Liefertermin</dt>
              <dd className="text-ink">{formatDateLong(order.delivery.date)}{order.delivery.windowLabel ? `, ${order.delivery.windowLabel}` : ""}</dd>
              <dd className="text-[13px] text-ink-muted">{order.delivery.zoneName}</dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Empfänger</dt>
              <dd className="text-ink">
                {order.recipient.firstName} {order.recipient.lastName}
                {order.recipient.company && <><br />{order.recipient.company}</>}
                <br />{order.recipient.street} {order.recipient.houseNumber}{order.recipient.addition ? `, ${order.recipient.addition}` : ""}
                <br />{order.recipient.zip} {order.recipient.city}
              </dd>
            </div>
            {order.delivery.note && (
              <div>
                <dt className="eyebrow mb-1">Hinweis für den Zusteller</dt>
                <dd className="text-ink-muted">{order.delivery.note}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Items */}
        <section aria-labelledby="items-title" className="rounded-lg border border-line bg-white/60 p-6 sm:p-8">
          <h2 id="items-title" className="mb-6 font-serif text-2xl text-ink">Artikel</h2>
          <ul className="divide-y divide-line">
            {order.lines.map((line, i) => (
              <li key={`${line.productId}-${line.sizeId}-${i}`} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-ivory-200">
                  {line.image && <Image src={line.image} alt="" fill sizes="64px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-serif text-[19px] leading-tight text-ink">{line.productName}</p>
                    <p className="shrink-0 text-[14px] font-semibold tabular-nums text-ink">{formatPrice(line.unitPrice * line.quantity)}</p>
                  </div>
                  <p className="text-[12.5px] text-ink-muted">{line.sizeLabel}{line.quantity > 1 ? ` · ${line.quantity}×` : ""}</p>
                  {line.extras.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1">
                      {line.extras.map((e) => (
                        <li key={e.extraId} className="flex justify-between gap-3 text-[12.5px] text-ink-muted">
                          <span>+ {e.name}{e.quantity > 1 ? ` × ${e.quantity}` : ""}</span>
                          <span className="tabular-nums">{formatPrice(e.unitPrice * e.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <dl className="mt-6 flex flex-col gap-2 border-t border-line pt-4 text-[14px]">
            <div className="flex justify-between"><dt className="text-ink-muted">Blumen</dt><dd className="tabular-nums">{formatPrice(order.totals.subtotal)}</dd></div>
            {order.totals.extras > 0 && <div className="flex justify-between"><dt className="text-ink-muted">Extras</dt><dd className="tabular-nums">{formatPrice(order.totals.extras)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-muted">Lieferung</dt><dd className="tabular-nums">{order.totals.delivery === 0 ? "Gratis" : formatPrice(order.totals.delivery)}</dd></div>
            {order.coupon && <div className="flex justify-between"><dt className="text-ink-muted">Gutschein {order.coupon.code}</dt><dd className="tabular-nums text-success">{order.coupon.discount > 0 ? `– ${formatPrice(order.coupon.discount)}` : "Gratis-Lieferung"}</dd></div>}
            <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3">
              <dt className="text-[15px] font-semibold text-ink">Gesamt</dt>
              <dd className="font-serif text-[26px] tabular-nums leading-none text-ink">{formatPrice(order.totals.total)}</dd>
            </div>
            <p className="text-[11.5px] text-ink-soft">inkl. MwSt.</p>
          </dl>
        </section>

        {/* Greeting */}
        <section aria-labelledby="card-title" className="rounded-lg border border-line bg-white/60 p-6 sm:p-8">
          <h2 id="card-title" className="mb-6 font-serif text-2xl text-ink">Grußkarte</h2>
          {greeting?.message || greeting?.senderName ? (
            <GreetingCardPreview message={greeting.message ?? ""} senderName={greeting.senderName} anonymous={greeting.anonymous} compact />
          ) : (
            <p className="text-[14px] text-ink-muted">Ohne Grußkarte.</p>
          )}
          <p className="mt-6 text-[13px] leading-relaxed text-ink-muted">Der Empfänger sieht keinen Preis und keine Rechnung – nur deine Worte.</p>
        </section>
      </div>

      {/* Contact hint */}
      <div className="mx-auto mt-10 max-w-5xl rounded-lg bg-ivory-100 p-6 text-[14px] leading-relaxed text-ink-muted sm:p-8">
        <p className="font-semibold text-ink">Fragen zu deiner Bestellung?</p>
        <p className="mt-1">
          Nenne uns bitte die Bestellnummer <strong className="font-semibold text-ink">{order.id}</strong>.
          {contactEmail && <> Schreib uns an <a href={`mailto:${contactEmail}`} className="text-forest underline underline-offset-2">{contactEmail}</a></>}
          {contactPhone && <>{contactEmail ? " oder ruf an unter" : " Ruf uns an unter"} <a href={`tel:${contactPhone.replace(/\s/g, "")}`} className="text-forest underline underline-offset-2">{contactPhone}</a></>}
          {!contactEmail && !contactPhone && <> Alle Kontaktmöglichkeiten findest du auf der <Link href={routes.contact} className="text-forest underline underline-offset-2">Kontaktseite</Link></>}.
        </p>
        <p className="mt-4"><Link href={routes.shop} className="font-semibold text-forest">Weiter stöbern</Link></p>
      </div>
    </div>
  );
}
