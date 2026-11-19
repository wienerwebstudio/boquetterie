import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Check, Clock, DoorOpen, Euro, type LucideProps } from "lucide-react";
import type { DeliveryZone, SiteSettings } from "@/types";
import { getDeliveryZones, getFaqs, getPageBySlug, getSettings } from "@/lib/content";
import { describeSameDayCutoff, describeZone, getAvailableDays, getLocalNow } from "@/lib/delivery";
import { cn } from "@/lib/format";
import { routes } from "@/lib/urls";
import { breadcrumbLd, faqLd, JsonLd } from "@/lib/seo";
import { PageHeader } from "@/components/content/page-header";
import { RichSections, cmsMetadata } from "@/components/content/cms-page";
import { PostalCodeCheck } from "@/components/shop/postal-code-check";
import { Accordion } from "@/components/ui/accordion";
import { SectionHeading } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { SMALL_BUSINESS } from "@/lib/vat";
import { getI18n, type I18n } from "@/i18n/server";
import { fmtRich } from "@/components/content/rich-text";

const SLUG = "lieferung";
const FAQ_CATEGORY = "lieferung";

/** Availability depends on the current time in the shop timezone. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [page, { m }] = await Promise.all([getPageBySlug(SLUG), getI18n()]);
  return cmsMetadata(page, m.content.delivery.fallbackTitle, routes.delivery);
}

export default async function DeliveryPage() {
  const [page, zones, faqs, settings, i18n] = await Promise.all([getPageBySlug(SLUG), getDeliveryZones(), getFaqs(), getSettings(), getI18n()]);
  if (!page) notFound();

  const deliveryFaqs = faqs.filter((f) => f.category === FAQ_CATEGORY);
  const now = getLocalNow(settings.timezone);
  const { m, fmt, price, href } = i18n;
  const t = m.content.delivery;

  // Everything in the summary below is derived from the active zones – no hard-coded districts or prices.
  const feeLevels = [...new Set(zones.map((z) => z.fee))].sort((a, b) => a - b).map((fee) => (fee === 0 ? t.free : price(fee)));
  const hasFreeThreshold = zones.some((z) => z.fee > 0 && z.freeFrom !== null);
  const windowLabels = [...new Set(zones.flatMap((z) => z.windows.filter((w) => w.active).map((w) => w.label)))];
  const deliveryDays = WEEKDAYS.filter((d) => zones.some((z) => z.deliveryDays.includes(d.index))).map((d) => t.weekdays[d.key]);

  return (
    <article>
      <PageHeader eyebrow={m.content.serviceEyebrow} title={page.title} intro={page.intro} crumbs={[{ label: page.title }]} />

      {/* PLZ check band */}
      <section aria-labelledby="plz-check-heading" className="container-x mt-10 sm:mt-14">
        <div className="grid grid-cols-1 overflow-hidden rounded-md bg-ivory-100 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex min-w-0 flex-col justify-center p-6 sm:p-10 lg:p-14">
            <p className="eyebrow mb-3">{t.checkEyebrow}</p>
            <h2 id="plz-check-heading" className="display-3 text-ink">{t.checkTitle}</h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
              {t.checkText}
            </p>
            <PostalCodeCheck variant="inline" title={t.checkInputTitle} className="mt-7 max-w-md" />
          </div>
          <div className="relative min-h-[240px] lg:min-h-0">
            <Image src="/images/products/sortiment/farbtaenzer-2.jpg" alt={t.imageAlt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      {/* Summary: fees, windows, nobody home */}
      {zones.length > 0 && (
        <section aria-labelledby="delivery-summary-heading" className="container-x pt-16 sm:pt-20 lg:pt-24">
          <h2 id="delivery-summary-heading" className="sr-only">{t.summaryTitle}</h2>
          <ul className="grid gap-8 md:grid-cols-3 md:gap-6">
            <SummaryItem icon={Euro} title={t.feesTitle}>
              {feeLevels.length > 1
                ? fmt(t.feeDependsOnDistrict, { fees: joinOr(feeLevels, t.or) })
                : feeLevels[0] === t.free ? t.feeIsFree : fmt(t.feeFixed, { fee: feeLevels[0] })}
              {!hasFreeThreshold && feeLevels.length > 1 && <> {t.feeIndependentOfOrder}</>}
              {feeLevels.length > 1 && <> {t.feeLevelsBelow}</>}
            </SummaryItem>
            {windowLabels.length > 0 && (
              <SummaryItem icon={Clock} title={windowLabels.length === 3 ? t.threeWindows : t.windows}>
                {fmt(t.chooseWindow, { windows: joinOr(windowLabels, t.or) })}
                {deliveryDays.length > 0 && <> {fmt(t.deliveryDaysNow, { days: deliveryDays.join(", ") })}</>}
              </SummaryItem>
            )}
            <SummaryItem icon={DoorOpen} title={t.nobodyHomeTitle}>
              {t.nobodyHomeText}
            </SummaryItem>
          </ul>
        </section>
      )}

      {/* Zones */}
      <section aria-label={t.zonesLabel} className="container-x py-16 sm:py-20 lg:py-24">
        <SectionHeading eyebrow={t.zonesEyebrow} title={t.zonesTitle} subtitle={t.zonesSubtitle} />
        {zones.length === 0 ? (
          <p className="text-[15px] text-ink-muted">{t.noZones}</p>
        ) : (
          <ul className={cn("grid gap-5", zones.length >= 4 ? "sm:grid-cols-2 xl:grid-cols-4" : zones.length === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>
            {zones.map((zone) => (
              <li key={zone.id}>
                <ZoneCard zone={zone} settings={settings} now={now} i18n={i18n} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-8 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
          {m.cart.vat[SMALL_BUSINESS ? "smallBusiness" : "standard"].note} {t.calendarNote}
        </p>
      </section>

      {/* Editorial sections */}
      {page.sections.length > 0 && (
        <section className="border-t border-line bg-ivory">
          <div className="container-x py-16 sm:py-20 lg:py-24">
            <RichSections sections={page.sections} />
          </div>
        </section>
      )}

      {/* FAQ */}
      {deliveryFaqs.length > 0 && (
        <section aria-labelledby="delivery-faq-heading" className="border-t border-line bg-ivory-100">
          <div className="container-x py-16 sm:py-20 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
              <div>
                <p className="eyebrow mb-3">{m.content.faqTitle}</p>
                <h2 id="delivery-faq-heading" className="display-2 text-balance text-ink">{t.faqTitle}</h2>
                <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-muted">
                  {fmtRich(t.moreAnswers, { faqLink: <a href={href(routes.faq)} className="text-forest underline underline-offset-4">{t.faqLink}</a> })}
                </p>
              </div>
              <Accordion items={deliveryFaqs.map((f) => ({ id: f.id, title: f.question, content: <p>{f.answer}</p> }))} />
            </div>
          </div>
          <JsonLd data={faqLd(deliveryFaqs)} />
        </section>
      )}

      <JsonLd data={breadcrumbLd([{ name: m.content.homeCrumb, url: "/" }, { name: page.title, url: routes.delivery }], settings)} />
    </article>
  );
}

/* ---------------- Zone card ---------------- */

function ZoneCard({ zone, settings, now, i18n }: { zone: DeliveryZone; settings: SiteSettings; now: ReturnType<typeof getLocalNow>; i18n: I18n }) {
  const { m, fmt, price, dateShort } = i18n;
  const t = m.content.delivery.zone;
  const info = describeZone(zone);
  const days = getAvailableDays({ zone, settings, now, horizonDays: 21 });
  const next = days[0];
  const sameDay = settings.sameDayEnabled && zone.sameDay;
  const windows = zone.windows.filter((w) => w.active);

  return (
    <div className="flex h-full flex-col rounded-md border border-line bg-white/70 p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{zone.region}</p>
          <h3 className="mt-1.5 font-serif text-2xl leading-tight text-ink">{zone.name}</h3>
        </div>
        {sameDay ? <Badge tone="forest">{t.sameDayBadge}</Badge> : null}
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
        <span className="font-semibold text-ink">{t.postalCodes} </span>
        {zone.postalCodes.map(formatPostalEntry).join(" · ")}
      </p>

      <dl className="mt-5 divide-y divide-line border-y border-line text-[14px]">
        <Row label={t.fee}>
          {info.fee === 0 ? t.feeFree : price(info.fee)}
          {info.fee > 0 && info.freeFrom !== null && <span className="text-ink-muted"> · {fmt(t.freeFrom, { price: price(info.freeFrom) })}</span>}
        </Row>
        {zone.minOrder > 0 && <Row label={t.minOrder}>{price(zone.minOrder)}</Row>}
        <Row label={t.days}>{info.days || "–"}</Row>
        {sameDay && (
          <Row label={t.sameDay}>
            <span className="inline-flex items-center gap-1.5 text-success"><Check className="size-3.5" strokeWidth={2.5} aria-hidden /> {fmt(t.sameDayYes, { cutoff: describeSameDayCutoff(zone) })}</span>
          </Row>
        )}
        <Row label={zone.leadDays <= 1 ? t.nextDeliveryDay : fmt(t.leadDays, { days: zone.leadDays })}>{fmt(t.orderUntil, { time: info.cutoff })}</Row>
        {windows.length > 0 && (
          <Row label={t.windows}>
            <ul className="space-y-1">
              {windows.map((w) => (
                <li key={w.id} className="flex justify-between gap-3">
                  <span>{w.label}</span>
                  <span className={w.surcharge > 0 ? "text-ink-muted" : "text-success"}>{w.surcharge > 0 ? `+ ${price(w.surcharge)}` : t.included}</span>
                </li>
              ))}
            </ul>
          </Row>
        )}
        {next && (
          <Row label={t.nextPossibleDay}>
            <span className="font-semibold text-forest">{next.sameDay ? t.today : dateShort(next.date)}</span>
          </Row>
        )}
      </dl>

      {zone.note && <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">{zone.note}</p>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3">
      <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

function SummaryItem({ icon: Icon, title, children }: { icon: React.ComponentType<LucideProps>; title: string; children: React.ReactNode }) {
  return (
    <li className="border-t border-line pt-6">
      <span className="inline-flex size-10 items-center justify-center rounded-full bg-ivory-100 text-forest">
        <Icon className="size-[18px]" strokeWidth={1.4} aria-hidden />
      </span>
      <h3 className="mt-5 font-serif text-[24px] leading-tight text-ink">{title}</h3>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">{children}</p>
    </li>
  );
}

/** Monday first, matching `DeliveryZone.deliveryDays` (0 = Sunday). */
const WEEKDAYS = [
  { index: 1, key: "mon" }, { index: 2, key: "tue" }, { index: 3, key: "wed" }, { index: 4, key: "thu" },
  { index: 5, key: "fri" }, { index: 6, key: "sat" }, { index: 0, key: "sun" },
] as const;

/** ["a", "b", "c"] -> "a, b oder c" */
function joinOr(items: string[], or: string) {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} ${or} ${items[items.length - 1]}`;
}

/** "1010-1090" -> "1010–1090" */
function formatPostalEntry(entry: string) {
  const [from, to] = entry.split("-").map((s) => s.trim());
  return to ? `${from}–${to}` : from;
}
