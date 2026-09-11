import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { FAQ } from "@/types";
import { getFaqs, getSettings } from "@/lib/cms";
import { routes } from "@/lib/urls";
import { breadcrumbLd, faqLd, JsonLd } from "@/lib/seo";
import { PageHeader } from "@/components/content/page-header";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const TITLE = "Häufige Fragen";
const INTRO = "Antworten zu Lieferung, Bestellung und Bezahlung sowie zur Pflege deiner Blumen. Falls etwas fehlt: Wir sind nur eine Nachricht entfernt.";

/** Known categories in display order. Unknown categories are appended under "Weitere Fragen". */
const GROUPS: { id: string; label: string }[] = [
  { id: "lieferung", label: "Lieferung" },
  { id: "bestellung", label: "Bestellung & Bezahlung" },
  { id: "produkt", label: "Blumen & Pflege" },
];
const OTHER = { id: "weitere", label: "Weitere Fragen" };

export const metadata: Metadata = {
  title: `${TITLE} – Lieferung, Bestellung & Pflege`,
  description: "Antworten auf häufige Fragen zu Blumenlieferung in Wien, Lieferzeiten, Zahlung, Grußkarten und Pflege der Blumen.",
  alternates: { canonical: routes.faq },
};

function groupFaqs(faqs: FAQ[]) {
  const known = new Set(GROUPS.map((g) => g.id));
  const groups = GROUPS.map((g) => ({ ...g, items: faqs.filter((f) => f.category === g.id) }));
  const rest = faqs.filter((f) => !f.category || !known.has(f.category));
  if (rest.length > 0) groups.push({ ...OTHER, items: rest });
  return groups.filter((g) => g.items.length > 0);
}

export default async function FaqPage() {
  const [faqs, settings] = await Promise.all([getFaqs(), getSettings()]);
  const groups = groupFaqs(faqs);

  return (
    <article>
      <PageHeader eyebrow="Service" title={TITLE} intro={INTRO} crumbs={[{ label: "FAQ" }]} />

      <div className="container-x py-14 sm:py-20 lg:py-24">
        {faqs.length === 0 ? (
          <p className="text-[15px] text-ink-muted">Derzeit sind keine Fragen hinterlegt.</p>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-20">
            {/* Sticky mini nav (desktop) */}
            <aside className="hidden lg:block">
              <nav aria-label="Themen" className="sticky top-28">
                <p className="eyebrow mb-4">Themen</p>
                <ul className="space-y-1 border-l border-line">
                  {groups.map((g) => (
                    <li key={g.id}>
                      <a href={`#${g.id}`} className="-ml-px block border-l border-transparent py-1.5 pl-4 text-[14px] text-ink-muted transition-colors hover:border-forest hover:text-forest">
                        {g.label}
                        <span className="ml-1.5 text-[12px] text-ink-muted">{g.items.length}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            {/* Mobile topic chips */}
            <nav aria-label="Themen" className="-mt-4 flex gap-2 overflow-x-auto scrollbar-none lg:hidden">
              {groups.map((g) => (
                <a key={g.id} href={`#${g.id}`} className="inline-flex shrink-0 rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] text-ink hover:border-forest hover:text-forest">
                  {g.label}
                </a>
              ))}
            </nav>

            <div className="max-w-3xl space-y-16 sm:space-y-20">
              {groups.map((g) => (
                <section key={g.id} id={g.id} aria-labelledby={`${g.id}-heading`} className="scroll-mt-28">
                  <h2 id={`${g.id}-heading`} className="display-3 mb-6 text-ink">{g.label}</h2>
                  <Accordion items={g.items.map((f) => ({ id: f.id, title: f.question, content: <p>{f.answer}</p> }))} />
                </section>
              ))}

              {/* Closing CTA */}
              <section aria-labelledby="faq-cta-heading" className="rounded-md bg-forest px-6 py-10 text-ivory sm:px-10 sm:py-12">
                <p className="eyebrow mb-3 text-sand">Nicht gefunden?</p>
                <h2 id="faq-cta-heading" className="display-3 text-ivory">Noch Fragen?</h2>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-sand">
                  Schreib uns – bei Fragen zu einer Bestellung am besten gleich mit der Bestellnummer. Wir melden uns so schnell wie möglich.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <Button href={routes.contact} variant="light" size="lg" iconRight={<ArrowRight className="size-4" aria-hidden />}>Kontakt aufnehmen</Button>
                  <Link href={routes.tracking} className="text-sm font-semibold text-ivory underline-offset-4 hover:underline">Bestellung verfolgen</Link>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {faqs.length > 0 && <JsonLd data={faqLd(faqs)} />}
      <JsonLd data={breadcrumbLd([{ name: "Start", url: "/" }, { name: TITLE, url: routes.faq }], settings)} />
    </article>
  );
}
