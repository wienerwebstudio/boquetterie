import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarClock, CircleAlert, CircleCheck, MapPin, UserRound } from "lucide-react";
import { getOrderById, getSettings } from "@/lib/content";
import { getProductsIn } from "@/lib/cms-localized";
import { findOfferByToken } from "@/lib/offers";
import { offerRecipientAddition, offerStatus, offerTimeLabel, offerTotals } from "@/lib/offers-core";
import { getLocalNow } from "@/lib/delivery";
import { SMALL_BUSINESS } from "@/lib/vat";
import { getI18n } from "@/i18n/server";
import { ClientMessages } from "@/i18n/scope";
import { Button } from "@/components/ui/button";
import { OfferPayment } from "@/components/offer/offer-payment";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  // Personal page behind a secret link: never indexed, never in the sitemap.
  return { title: m.offer.metaTitle, robots: { index: false, follow: false, nocache: true } };
}

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function Notice({ tone, title, text, action }: { tone: "ok" | "warn"; title: string; text: string; action?: React.ReactNode }) {
  const Icon = tone === "ok" ? CircleCheck : CircleAlert;
  return (
    <div className="container-x py-16 lg:py-24">
      <div className="mx-auto max-w-lg text-center">
        <span className={tone === "ok" ? "mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-forest text-ivory" : "mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-rose-100 text-burgundy"}>
          <Icon className="size-6" strokeWidth={1.5} aria-hidden />
        </span>
        <h1 className="display-2 text-balance text-ink">{title}</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">{text}</p>
        {action}
      </div>
    </div>
  );
}

/** Public page of an individual offer (`/angebot/<token>`) – summary and online payment. */
export default async function OfferPage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const offer = await findOfferByToken(token);
  // Drafts are not shared yet – behave exactly like an unknown link.
  if (!offer || offer.status === "draft") notFound();

  const [settings, i18n] = await Promise.all([getSettings(), getI18n()]);
  const { m, fmt, price, dateLong, locale } = i18n;
  const t = m.offer;
  const status = offerStatus(offer, getLocalNow(settings.timezone).date);
  const contact = settings.brand.email && !settings.brand.email.startsWith("[") ? settings.brand.email : null;

  if (status === "paid") {
    const order = offer.orderId ? await getOrderById(offer.orderId) : null;
    return (
      <Notice tone="ok" title={t.paidTitle} text={t.paidText}
        action={order ? <Button href={`/bestellung/${encodeURIComponent(order.id)}?token=${encodeURIComponent(order.token)}`} size="lg" className="mt-8">{t.viewOrder}</Button> : undefined} />
    );
  }
  if (status === "expired" || status === "cancelled") {
    return (
      <Notice tone="warn" title={status === "expired" ? t.expiredTitle : t.cancelledTitle} text={status === "expired" ? t.expiredText : t.cancelledText}
        action={contact ? <p className="mt-6 text-[14px] text-ink-muted"><a href={`mailto:${contact}`} className="font-semibold text-forest underline underline-offset-2">{contact}</a></p> : undefined} />
    );
  }

  // Shop products in the page's language (custom items keep the text the team wrote).
  const products = locale === "de" ? [] : await getProductsIn(locale, true).catch(() => []);
  const titleOf = (it: (typeof offer.items)[number]) => (it.kind === "product" && products.find((p) => p.id === it.productId)?.name) || it.title;
  const totals = offerTotals(offer);
  const vat = m.cart.vat[SMALL_BUSINESS ? "smallBusiness" : "standard"];
  const r = offer.recipient;
  const addition = offerRecipientAddition(r);
  const cardsEnabled = settings.greetingCard?.enabled === true;

  return (
    <div className="container-x py-10 lg:py-16">
      <header className="mx-auto max-w-2xl text-center">
        <p className="eyebrow mb-3">{fmt(t.eyebrow, { id: offer.id })}</p>
        <h1 className="display-2 text-balance text-ink animate-fade-up">{t.title}</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">{fmt(t.intro, { name: offer.customer.firstName })}</p>
      </header>

      <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="offer-items" className="rounded-lg border border-line bg-white/60 p-6 sm:p-8">
            <h2 id="offer-items" className="mb-6 font-serif text-2xl text-ink">{t.items}</h2>
            <ul className="divide-y divide-line">
              {offer.items.map((it) => (
                <li key={it.id} className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row">
                  {it.image && (
                    <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden rounded-md bg-ivory-200 sm:w-40">
                      <Image src={it.image} alt={titleOf(it)} fill sizes="(min-width: 640px) 160px, 100vw" className="object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-serif text-[21px] leading-tight text-ink">{it.quantity > 1 ? `${it.quantity} × ` : ""}{titleOf(it)}</p>
                      <p className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">{price(it.unitPrice * it.quantity)}</p>
                    </div>
                    {it.kind === "product" && it.sizeLabel && <p className="mt-1 text-[13px] text-ink-muted">{it.sizeLabel}</p>}
                    {it.description && <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-muted">{it.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
            {offer.extras.length > 0 && (
              <ul className="mt-5 flex flex-col gap-1.5 border-t border-line pt-4 text-[14px] text-ink-muted">
                {offer.extras.map((e) => (
                  <li key={e.extraId} className="flex justify-between gap-3">
                    <span>+ {e.quantity > 1 ? `${e.quantity} × ` : ""}{e.name}</span>
                    <span className="tabular-nums">{price(e.unitPrice * e.quantity)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="offer-delivery" className="rounded-lg border border-line bg-white/60 p-6 sm:p-8">
            <h2 id="offer-delivery" className="mb-6 font-serif text-2xl text-ink">{t.delivery}</h2>
            <dl className="grid gap-5 text-[14.5px] sm:grid-cols-2">
              <div className="flex gap-3">
                <CalendarClock className="mt-0.5 size-5 shrink-0 text-forest" strokeWidth={1.5} aria-hidden />
                <div><dt className="eyebrow mb-1">{t.date}</dt><dd className="text-ink">{offer.delivery.enabled || offer.delivery.date ? dateLong(offer.delivery.date || offer.validUntil) : t.byArrangement}{offerTimeLabel(offer.delivery) ? <><br />{offerTimeLabel(offer.delivery)}</> : null}</dd></div>
              </div>
              {offer.delivery.enabled ? (<>
              <div className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-forest" strokeWidth={1.5} aria-hidden />
                <div>
                  <dt className="eyebrow mb-1">{t.place}</dt>
                  <dd className="text-ink">
                    {r.company && <>{r.company}<br /></>}
                    {addition && r.kind === "meeting" && <><strong className="font-semibold">{r.addition}</strong><br /></>}
                    {[r.street, r.houseNumber].filter(Boolean).join(" ")}{addition && r.kind !== "meeting" ? `, ${addition}` : ""}{r.street ? <br /> : null}{[r.zip, r.city].filter(Boolean).join(" ")}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <UserRound className="mt-0.5 size-5 shrink-0 text-forest" strokeWidth={1.5} aria-hidden />
                <div><dt className="eyebrow mb-1">{t.recipient}</dt><dd className="text-ink">{r.firstName} {r.lastName}</dd></div>
              </div>
              </>) : (
              <div className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-forest" strokeWidth={1.5} aria-hidden />
                <div><dt className="eyebrow mb-1">{t.place}</dt><dd className="text-ink">{t.byArrangement}</dd></div>
              </div>
              )}
              {cardsEnabled && offer.greeting?.message && (
                <div className="sm:col-span-2">
                  <dt className="eyebrow mb-1">{t.card}</dt>
                  <dd className="whitespace-pre-line font-serif text-[17px] italic text-ink">„{offer.greeting.message}“{offer.greeting.senderName ? <span className="block font-sans text-[13px] not-italic text-ink-muted">– {offer.greeting.senderName}</span> : null}</dd>
                </div>
              )}
              {offer.delivery.note && <div className="sm:col-span-2"><dt className="eyebrow mb-1">{m.checkout.order.note}</dt><dd className="text-ink-muted">{offer.delivery.note}</dd></div>}
            </dl>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <section aria-labelledby="offer-pay" className="rounded-lg border border-line bg-white p-6 shadow-soft sm:p-8">
            <h2 id="offer-pay" className="mb-5 font-serif text-2xl text-ink">{t.payTitle}</h2>
            <dl className="flex flex-col gap-2 text-[14px]">
              <div className="flex justify-between"><dt className="text-ink-muted">{t.flowers}</dt><dd className="tabular-nums">{price(totals.items)}</dd></div>
              {totals.extras > 0 && <div className="flex justify-between"><dt className="text-ink-muted">{t.extras}</dt><dd className="tabular-nums">{price(totals.extras)}</dd></div>}
              <div className="flex justify-between"><dt className="text-ink-muted">{t.deliveryFee}</dt><dd className="tabular-nums">{totals.delivery > 0 ? price(totals.delivery) : t.free}</dd></div>
              <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3">
                <dt className="text-[15px] font-semibold text-ink">{m.cart.drawer.total} <span className="text-[12px] font-normal text-ink-muted">{vat.short}</span></dt>
                <dd className="font-serif text-[26px] tabular-nums text-ink" data-testid="offer-total">{price(totals.total)}</dd>
              </div>
              <p className="text-[12px] leading-relaxed text-ink-soft">{vat.note}</p>
            </dl>
            <p className="mt-4 rounded-md bg-ivory-100 px-3 py-2 text-[13px] text-ink">{fmt(t.validUntil, { date: dateLong(offer.validUntil) })}</p>
            <div className="mt-6">
              <ClientMessages ns={["checkout", "offer"]}>
                <OfferPayment
                  token={offer.token}
                  total={totals.total}
                  email={offer.customer.email}
                  name={`${offer.customer.firstName} ${offer.customer.lastName}`.trim()}
                  cancelled={sp.abgebrochen === "1"}
                />
              </ClientMessages>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
