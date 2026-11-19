import type { Metadata } from "next";
import Link from "@/components/ui/link";
import Image from "next/image";
import { timingSafeEqual } from "node:crypto";
import { CircleAlert, CircleCheck, Search } from "lucide-react";
import { getOrderById, getSettings } from "@/lib/cms";
import { ORDER_STATUS_FLOW, isNegativeStatus, publicOrderView } from "@/lib/orders";
import { isTestOrder } from "@/lib/payments";
import { cn } from "@/lib/format";
import { getI18n } from "@/i18n/server";
import { rich } from "@/components/checkout/rich-text";
import { routes } from "@/lib/urls";
import { Button } from "@/components/ui/button";
import { OrderTimeline } from "@/components/checkout/order-timeline";
import { GreetingCardPreview } from "@/components/checkout/greeting-card-preview";
import { OrderPlacedCleanup } from "@/components/checkout/order-placed-cleanup";
import { SMALL_BUSINESS } from "@/lib/vat";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return {
    title: m.checkout.order.metaTitle,
    robots: { index: false, follow: false },
  };
}

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function tokenMatches(expected: string, given: string) {
  if (!given || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

async function NotFoundView() {
  const t = (await getI18n()).m.checkout.order;
  return (
    <div className="container-x py-16 lg:py-24">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-ivory-200 text-forest"><Search className="size-6" strokeWidth={1.5} aria-hidden /></span>
        <h1 className="display-2 text-ink">{t.notFoundTitle}</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
          {t.notFoundText}
        </p>
        <Button href={routes.tracking} size="lg" className="mt-8">{t.trackOrder}</Button>
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
  const { m, fmt, price, dateLong } = await getI18n();
  const t = m.checkout.order;
  const vat = m.cart.vat[SMALL_BUSINESS ? "smallBusiness" : "standard"];
  const definitions = settings.orderStatuses;
  const current = definitions.find((d) => d.key === order.status);
  const negative = isNegativeStatus(order.status);
  const testMode = isTestOrder(order);
  const providerName = order.payment.provider === "stripe" ? "Stripe" : order.payment.provider === "paypal" ? "PayPal" : null;
  const greeting = order.lines.find((l) => l.message || l.senderName || l.anonymous);
  const contactEmail = settings.brand.email.startsWith("[") ? null : settings.brand.email;
  const contactPhone = settings.brand.phone.startsWith("[") ? null : settings.brand.phone;

  const paymentLabel = {
    paid: `${t.paymentPaid}${testMode ? t.testModeSuffix : ""}`,
    pending: t.paymentPending,
    failed: t.paymentFailed,
    refunded: t.paymentRefunded,
  }[order.payment.status] ?? order.payment.status;
  const paymentTone = order.payment.status === "paid" ? "text-success" : order.payment.status === "pending" ? "text-warn" : order.payment.status === "refunded" ? "text-ink" : "text-danger";
  const paymentHint = testMode
    ? t.hintTestMode
    : order.payment.status === "pending"
      ? fmt(t.hintPending, { provider: providerName ? fmt(t.providerSuffix, { name: providerName }) : "" })
      : order.payment.status === "failed"
        ? t.hintFailed
        : order.payment.status === "refunded"
          ? t.hintRefunded
          : null;

  return (
    <div className="container-x py-10 lg:py-16">
      {/* Header */}
      <header className="mx-auto max-w-2xl text-center">
        {isNew ? (
          <>
            <OrderPlacedCleanup />
            <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-forest text-ivory animate-fade-in"><CircleCheck className="size-7" strokeWidth={1.5} aria-hidden /></span>
            <p className="eyebrow mb-3">{fmt(t.eyebrow, { id: order.id })}</p>
            <h1 className="display-2 text-balance text-ink animate-fade-up">
              {order.payment.status === "pending" ? t.thanksPending : t.thanksConfirmed}
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
              {order.payment.status === "pending" ? t.introPending : t.introConfirmed}
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow mb-3">{fmt(t.eyebrow, { id: order.id })}</p>
            <h1 className="display-2 text-balance text-ink">{negative ? current?.label ?? t.status : t.goodHands}</h1>
          </>
        )}
        <p className="mt-4 text-[13px] text-ink-soft">{t.linkInMail}</p>
      </header>

      <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
        {/* Status */}
        <section aria-labelledby="status-title" className="rounded-lg border border-line bg-white/60 p-6 sm:p-8">
          <h2 id="status-title" className="mb-6 font-serif text-2xl text-ink">{t.status}</h2>
          {negative ? (
            <div role="alert" className="flex gap-3 rounded-md border border-rose/40 bg-rose-100/60 p-4">
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-burgundy" aria-hidden />
              <div>
                <p className="font-semibold text-ink">{current?.label}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">{current?.description}</p>
                {order.status === "undeliverable" && <p className="mt-2 text-[14px] text-ink-muted">{fmt(t.undeliverable, { email: order.customer.email })}</p>}
              </div>
            </div>
          ) : (
            <OrderTimeline flow={ORDER_STATUS_FLOW} definitions={definitions} status={order.status} history={order.history} />
          )}
          <dl className="mt-8 grid gap-3 border-t border-line pt-6 text-[14px]">
            <div className="flex justify-between gap-4"><dt className="text-ink-muted">{t.payment}</dt><dd className={cn("text-right font-semibold", paymentTone)}>{paymentLabel}</dd></div>
            {paymentHint && <p className="text-[12.5px] leading-relaxed text-ink-soft">{paymentHint}</p>}
          </dl>
        </section>

        {/* Delivery & recipient */}
        <section aria-labelledby="delivery-title" className="rounded-lg border border-line bg-white/60 p-6 sm:p-8">
          <h2 id="delivery-title" className="mb-6 font-serif text-2xl text-ink">{t.delivery}</h2>
          <dl className="grid gap-5 text-[14.5px]">
            <div>
              <dt className="eyebrow mb-1">{t.deliveryDate}</dt>
              <dd className="text-ink">{dateLong(order.delivery.date)}{order.delivery.windowLabel ? `, ${order.delivery.windowLabel}` : ""}</dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">{t.recipient}</dt>
              <dd className="text-ink">
                {order.recipient.firstName} {order.recipient.lastName}
                {order.recipient.company && <><br />{order.recipient.company}</>}
                <br />{order.recipient.street} {order.recipient.houseNumber}{order.recipient.addition ? `, ${order.recipient.addition}` : ""}
                <br />{order.recipient.zip} {order.recipient.city}
              </dd>
            </div>
            {order.delivery.note && (
              <div>
                <dt className="eyebrow mb-1">{t.note}</dt>
                <dd className="text-ink-muted">{order.delivery.note}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Items */}
        <section aria-labelledby="items-title" className="rounded-lg border border-line bg-white/60 p-6 sm:p-8">
          <h2 id="items-title" className="mb-6 font-serif text-2xl text-ink">{t.items}</h2>
          <ul className="divide-y divide-line">
            {order.lines.map((line, i) => (
              <li key={`${line.productId}-${line.sizeId}-${i}`} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-ivory-200">
                  {line.image && <Image src={line.image} alt="" fill sizes="64px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-serif text-[19px] leading-tight text-ink">{line.productName}</p>
                    <p className="shrink-0 text-[14px] font-semibold tabular-nums text-ink">{price(line.unitPrice * line.quantity)}</p>
                  </div>
                  <p className="text-[12.5px] text-ink-muted">{line.sizeLabel}{line.quantity > 1 ? ` · ${line.quantity}×` : ""}</p>
                  {line.extras.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1">
                      {line.extras.map((e) => (
                        <li key={e.extraId} className="flex justify-between gap-3 text-[12.5px] text-ink-muted">
                          <span>+ {e.name}{e.quantity > 1 ? ` × ${e.quantity}` : ""}</span>
                          <span className="tabular-nums">{price(e.unitPrice * e.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <dl className="mt-6 flex flex-col gap-2 border-t border-line pt-4 text-[14px]">
            <div className="flex justify-between"><dt className="text-ink-muted">{t.flowers}</dt><dd className="tabular-nums">{price(order.totals.subtotal)}</dd></div>
            {order.totals.extras > 0 && <div className="flex justify-between"><dt className="text-ink-muted">{t.extras}</dt><dd className="tabular-nums">{price(order.totals.extras)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-muted">{t.delivery}</dt><dd className="tabular-nums">{order.totals.delivery === 0 ? t.free : price(order.totals.delivery)}</dd></div>
            {order.coupon && <div className="flex justify-between"><dt className="text-ink-muted">{fmt(t.coupon, { code: order.coupon.code })}</dt><dd className="tabular-nums text-success">{order.coupon.discount > 0 ? `– ${price(order.coupon.discount)}` : t.freeDelivery}</dd></div>}
            <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3">
              <dt className="text-[15px] font-semibold text-ink">{t.total}</dt>
              <dd className="font-serif text-[26px] tabular-nums leading-none text-ink">{price(order.totals.total)}</dd>
            </div>
            <p className="text-[11.5px] text-ink-soft">{vat.note}</p>
          </dl>
        </section>

        {/* Greeting – only for orders that carry a card */}
        {(greeting?.message || greeting?.senderName) && (
          <section aria-labelledby="card-title" className="rounded-lg border border-line bg-white/60 p-6 sm:p-8">
            <h2 id="card-title" className="mb-6 font-serif text-2xl text-ink">{t.greetingCard}</h2>
            <GreetingCardPreview message={greeting.message ?? ""} senderName={greeting.senderName} anonymous={greeting.anonymous} compact />
            <p className="mt-6 text-[13px] leading-relaxed text-ink-muted">{t.greetingNote}</p>
          </section>
        )}
      </div>

      {/* Contact hint */}
      <div className="mx-auto mt-10 max-w-5xl rounded-lg bg-ivory-100 p-6 text-[14px] leading-relaxed text-ink-muted sm:p-8">
        <p className="font-semibold text-ink">{t.questions}</p>
        <p className="mt-1">
          {rich(t.mentionId, { id: <strong className="font-semibold text-ink">{order.id}</strong> })}
          {contactEmail && rich(t.writeUs, { email: <a href={`mailto:${contactEmail}`} className="text-forest underline underline-offset-2">{contactEmail}</a> })}
          {contactPhone && <>{contactEmail ? t.orCall : t.call} <a href={`tel:${contactPhone.replace(/\s/g, "")}`} className="text-forest underline underline-offset-2">{contactPhone}</a></>}
          {!contactEmail && !contactPhone && rich(t.contactPage, { link: <Link href={routes.contact} className="text-forest underline underline-offset-2">{t.contactLink}</Link> })}.
        </p>
        <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <Link href={routes.shop} className="font-semibold text-forest">{t.continueShopping}</Link>
          <Link href={routes.legal.withdrawalForm} className="text-forest underline underline-offset-2">{t.withdraw}</Link>
        </p>
      </div>
    </div>
  );
}
