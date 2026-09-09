import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone, MapPin, Clock, ArrowRight } from "lucide-react";
import { getFaqs, getPageBySlug, getSettings } from "@/lib/cms";
import { routes } from "@/lib/urls";
import { breadcrumbLd, JsonLd } from "@/lib/seo";
import { cn } from "@/lib/format";
import { PageHeader } from "@/components/content/page-header";
import { RichSections, cmsMetadata } from "@/components/content/cms-page";
import { ContactForm } from "@/components/content/contact-form";

const SLUG = "kontakt";

export async function generateMetadata(): Promise<Metadata> {
  return cmsMetadata(await getPageBySlug(SLUG), "Kontakt", routes.contact);
}

/** Settings values that still need to be filled in start with "[" (see settings.json). */
const isPlaceholder = (v: string) => v.trim().startsWith("[");

/** Category groups that exist as anchors on the FAQ page. */
const FAQ_ANCHORS = new Set(["lieferung", "bestellung", "produkt"]);
const faqHref = (category?: string) => (category && FAQ_ANCHORS.has(category) ? `${routes.faq}#${category}` : routes.faq);

export default async function ContactPage() {
  const [page, settings, faqs] = await Promise.all([getPageBySlug(SLUG), getSettings(), getFaqs()]);
  if (!page) notFound();

  const { brand } = settings;
  const address = brand.address;
  const quickFaqs = faqs.slice(0, 4);
  // Placeholder sections on this page only repeat that details come from settings – the block below already shows them.
  const extraSections = page.sections.filter((s) => !s.placeholder);

  return (
    <article>
      <PageHeader eyebrow="Service" title={page.title} intro={page.intro} crumbs={[{ label: page.title }]} />

      <div className="container-x py-14 sm:py-20 lg:py-24">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-20">
          {/* Contact details */}
          <div className="space-y-12">
            <section aria-labelledby="contact-details-heading">
              <p className="eyebrow mb-3">So erreichst du uns</p>
              <h2 id="contact-details-heading" className="display-3 text-ink">Direkt & persönlich</h2>
              <address className="mt-8 divide-y divide-line border-y border-line not-italic">
                <Detail icon={<Mail className="size-4" aria-hidden />} label="E-Mail">
                  <Value value={brand.email} href={isPlaceholder(brand.email) ? undefined : `mailto:${brand.email}`} />
                </Detail>
                <Detail icon={<Phone className="size-4" aria-hidden />} label="Telefon">
                  <Value value={brand.phone} href={isPlaceholder(brand.phone) ? undefined : `tel:${brand.phone.replace(/[^\d+]/g, "")}`} />
                </Detail>
                <Detail icon={<MapPin className="size-4" aria-hidden />} label="Adresse">
                  <Value value={address.street} />
                  <span className="block text-ink">{address.zip} {address.city}, {address.country}</span>
                </Detail>
                <Detail icon={<Clock className="size-4" aria-hidden />} label="Erreichbar">
                  {brand.openingHours.length > 0
                    ? brand.openingHours.map((h, i) => <Value key={i} value={h} />)
                    : <span className="text-ink-soft">–</span>}
                </Detail>
              </address>
            </section>

            {quickFaqs.length > 0 && (
              <section aria-labelledby="quick-faq-heading" className="rounded-md bg-ivory-100 p-6 sm:p-8">
                <p className="eyebrow mb-3">Häufige Fragen</p>
                <h2 id="quick-faq-heading" className="font-serif text-2xl text-ink">Vielleicht ist die Antwort schon da</h2>
                <ul className="mt-5 divide-y divide-line">
                  {quickFaqs.map((f) => (
                    <li key={f.id}>
                      <Link href={faqHref(f.category)} className="group flex items-center justify-between gap-4 py-3 text-[14.5px] text-ink transition-colors hover:text-forest">
                        {f.question}
                        <ArrowRight className="size-4 shrink-0 text-stone transition-transform group-hover:translate-x-1 group-hover:text-forest" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href={routes.faq} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest">
                  Alle Fragen ansehen <ArrowRight className="size-4" aria-hidden />
                </Link>
              </section>
            )}
          </div>

          {/* Form */}
          <section aria-labelledby="contact-form-heading" className="rounded-md border border-line bg-white/70 p-6 shadow-soft sm:p-10">
            <p className="eyebrow mb-3">Nachricht</p>
            <h2 id="contact-form-heading" className="display-3 text-ink">Schreib uns</h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
              Bei Fragen zu einer Bestellung hilft uns die Bestellnummer, dir schneller zu antworten.
            </p>
            <ContactForm className="mt-8" />
          </section>
        </div>

        {extraSections.length > 0 && (
          <div className="mt-20 border-t border-line pt-16 sm:mt-24 sm:pt-20">
            <RichSections sections={extraSections} />
          </div>
        )}
      </div>

      <JsonLd data={breadcrumbLd([{ name: "Start", url: "/" }, { name: page.title, url: routes.contact }], settings)} />
    </article>
  );
}

function Detail({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 py-4">
      <span className="mt-0.5 inline-flex size-8 items-center justify-center rounded-full bg-ivory-100 text-forest">{icon}</span>
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">{label}</p>
        <div className="mt-1 text-[15px] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

/** Renders a settings value; placeholders ("[…]") are shown muted and clearly marked, never as real data. */
function Value({ value, href }: { value: string; href?: string }) {
  if (isPlaceholder(value)) {
    return (
      <span className="block">
        <span className="rounded-sm border border-dashed border-stone px-1.5 py-0.5 text-[13px] italic text-ink-soft">{value}</span>
      </span>
    );
  }
  const cls = cn("block text-ink", href && "transition-colors hover:text-forest");
  return href ? <a href={href} className={cls}>{value}</a> : <span className={cls}>{value}</span>;
}
