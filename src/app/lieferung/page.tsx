import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Check, Minus } from "lucide-react";
import type { DeliveryZone, SiteSettings } from "@/types";
import { getDeliveryZones, getFaqs, getPageBySlug, getSettings } from "@/lib/cms";
import { describeSameDayCutoff, describeZone, getAvailableDays, getLocalNow } from "@/lib/delivery";
import { cn, formatDateShort, formatPrice } from "@/lib/format";
import { routes } from "@/lib/urls";
import { breadcrumbLd, faqLd, JsonLd } from "@/lib/seo";
import { PageHeader } from "@/components/content/page-header";
import { RichSections, cmsMetadata } from "@/components/content/cms-page";
import { PostalCodeCheck } from "@/components/shop/postal-code-check";
import { Accordion } from "@/components/ui/accordion";
import { SectionHeading } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";

const SLUG = "lieferung";
const FAQ_CATEGORY = "lieferung";

/** Availability depends on the current time in the shop timezone. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return cmsMetadata(await getPageBySlug(SLUG), "Lieferung & Versand", routes.delivery);
}

export default async function DeliveryPage() {
  const [page, zones, faqs, settings] = await Promise.all([getPageBySlug(SLUG), getDeliveryZones(), getFaqs(), getSettings()]);
  if (!page) notFound();

  const deliveryFaqs = faqs.filter((f) => f.category === FAQ_CATEGORY);
  const now = getLocalNow(settings.timezone);

  return (
    <article>
      <PageHeader eyebrow="Service" title={page.title} intro={page.intro} crumbs={[{ label: page.title }]} />

      {/* PLZ check band */}
      <section aria-labelledby="plz-check-heading" className="container-x mt-10 sm:mt-14">
        <div className="grid overflow-hidden rounded-md bg-ivory-100 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-14">
            <p className="eyebrow mb-3">Lieferprüfung</p>
            <h2 id="plz-check-heading" className="display-3 text-ink">Wohin sollen die Blumen?</h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
              Postleitzahl der Empfängeradresse eingeben – wir zeigen dir Liefertage, Lieferkosten und ob eine Lieferung heute möglich ist.
            </p>
            <PostalCodeCheck variant="inline" title="Postleitzahl der Empfängeradresse" className="mt-7 max-w-md" />
          </div>
          <div className="relative min-h-[240px] lg:min-h-0">
            <Image src="/images/editorial/delivery.jpg" alt="Ein Strauß wird durch einen Wiener Innenhof getragen" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      {/* Zones */}
      <section aria-label="Liefergebiete" className="container-x py-16 sm:py-20 lg:py-24">
        <SectionHeading eyebrow="Liefergebiete" title="Unsere Liefergebiete im Überblick" subtitle="Lieferkosten, Liefertage und Zeitfenster je Gebiet. Ab welchem Bestellwert die Lieferung gratis ist, siehst du ebenfalls hier." />
        {zones.length === 0 ? (
          <p className="text-[15px] text-ink-muted">Derzeit sind keine Liefergebiete hinterlegt.</p>
        ) : (
          <ul className={cn("grid gap-5", zones.length >= 4 ? "sm:grid-cols-2 xl:grid-cols-4" : zones.length === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>
            {zones.map((zone) => (
              <li key={zone.id}>
                <ZoneCard zone={zone} settings={settings} now={now} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-8 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
          Alle Preise inkl. USt. Aufpreise für Zeitfenster werden im Checkout ausgewiesen. Ob eine Lieferung am gewünschten Tag möglich ist, hängt vom Bestellzeitpunkt und von unseren Ruhetagen ab.
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
                <p className="eyebrow mb-3">Häufige Fragen</p>
                <h2 id="delivery-faq-heading" className="display-2 text-balance text-ink">Fragen zur Lieferung</h2>
                <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-muted">
                  Mehr Antworten findest du in unseren <a href={routes.faq} className="text-forest underline underline-offset-4">FAQ</a>.
                </p>
              </div>
              <Accordion items={deliveryFaqs.map((f) => ({ id: f.id, title: f.question, content: <p>{f.answer}</p> }))} />
            </div>
          </div>
          <JsonLd data={faqLd(deliveryFaqs)} />
        </section>
      )}

      <JsonLd data={breadcrumbLd([{ name: "Start", url: "/" }, { name: page.title, url: routes.delivery }], settings)} />
    </article>
  );
}

/* ---------------- Zone card ---------------- */

function ZoneCard({ zone, settings, now }: { zone: DeliveryZone; settings: SiteSettings; now: ReturnType<typeof getLocalNow> }) {
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
        {sameDay ? <Badge tone="forest">Same Day</Badge> : null}
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
        <span className="font-semibold text-ink">PLZ </span>
        {zone.postalCodes.map(formatPostalEntry).join(" · ")}
      </p>

      <dl className="mt-5 divide-y divide-line border-y border-line text-[14px]">
        <Row label="Lieferkosten">
          {formatPrice(info.fee)}
          {info.freeFrom !== null && <span className="text-ink-muted"> · gratis ab {formatPrice(info.freeFrom)}</span>}
        </Row>
        {zone.minOrder > 0 && <Row label="Mindestbestellwert">{formatPrice(zone.minOrder)}</Row>}
        <Row label="Liefertage">{info.days || "–"}</Row>
        <Row label="Lieferung am selben Tag">
          {sameDay ? (
            <span className="inline-flex items-center gap-1.5 text-success"><Check className="size-3.5" strokeWidth={2.5} aria-hidden /> Ja · {describeSameDayCutoff(zone)}</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-ink-muted"><Minus className="size-3.5" aria-hidden /> Nein</span>
          )}
        </Row>
        <Row label={zone.leadDays <= 1 ? "Lieferung am nächsten Liefertag" : `Vorlaufzeit ${zone.leadDays} Tage`}>Bestellung bis {info.cutoff} Uhr</Row>
        {windows.length > 0 && (
          <Row label="Zeitfenster">
            <ul className="space-y-1">
              {windows.map((w) => (
                <li key={w.id} className="flex justify-between gap-3">
                  <span>{w.label}</span>
                  <span className={w.surcharge > 0 ? "text-ink-muted" : "text-success"}>{w.surcharge > 0 ? `+ ${formatPrice(w.surcharge)}` : "inklusive"}</span>
                </li>
              ))}
            </ul>
          </Row>
        )}
        {next && (
          <Row label="Nächste Lieferung">
            <span className="font-semibold text-forest">{next.sameDay ? "Heute" : formatDateShort(next.date)}</span>
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
      <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

/** "1010-1090" -> "1010–1090" */
function formatPostalEntry(entry: string) {
  const [from, to] = entry.split("-").map((s) => s.trim());
  return to ? `${from}–${to}` : from;
}
