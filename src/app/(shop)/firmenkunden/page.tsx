import type { Metadata } from "next";
import { Building2, CalendarDays, Gift, type LucideProps } from "lucide-react";
import { getSettings } from "@/lib/cms";
import { routes } from "@/lib/urls";
import { breadcrumbLd, JsonLd } from "@/lib/seo";
import { PageHeader } from "@/components/content/page-header";
import { BusinessInquiryForm } from "./business-inquiry-form";
import { pageMetadata } from "@/lib/metadata";

const PATH = "/firmenkunden";
const TITLE = "Firmenkunden";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Blumen für Firmen in Wien – auf Anfrage",
    description: "Blumen für Büro und Empfang, Geschenke für Kund:innen und Mitarbeiter:innen oder Blumen für Veranstaltungen in Wien: Schick uns deine Anfrage über das Formular.",
    path: PATH,
  });
}

type Icon = React.ComponentType<LucideProps>;

/** What companies can ask for. Nothing here is a standing offer – everything is clarified per inquiry. */
const REQUESTS: { icon: Icon; title: string; text: string }[] = [
  {
    icon: Building2,
    title: "Blumen für Büro und Empfang",
    text: "Regelmäßig frische Blumen für Empfang, Büro oder Besprechungsraum. Ob und in welchem Rhythmus das an deinem Standort möglich ist, klären wir auf Anfrage.",
  },
  {
    icon: Gift,
    title: "Geschenke für Kund:innen und Mitarbeiter:innen",
    text: "Sträuße zu Jubiläen, Geburtstagen oder als Danke – für eine Person oder für mehrere Adressen in Wien.",
  },
  {
    icon: CalendarDays,
    title: "Blumen für Veranstaltungen",
    text: "Für Eröffnungen, Feiern oder Konferenzen in Wien. Nenn uns Termin, Ort und ungefähren Umfang – wir melden uns, ob und wie wir das umsetzen können.",
  },
];

const GOOD_TO_KNOW: { title: string; text: string }[] = [
  { title: "Lieferung in Wien", text: "Wir liefern in alle 23 Wiener Bezirke, von Montag bis Sonntag." },
  { title: "Von Hand gebunden", text: "Die Sträuße bindet eine Wiener Floristik, mit der wir fest zusammenarbeiten – jeweils für die einzelne Bestellung." },
  { title: "Direkt per Kurier", text: "Ein Kurier holt die Blumen in der Floristik ab und fährt ohne Zwischenstopp zur Empfängeradresse." },
  { title: "Einzelne Sträuße", text: "Einen einzelnen Strauß an eine Firmenadresse bestellst du direkt im Shop. Den Firmennamen gibst du im Checkout an." },
];

const NEXT_STEPS = [
  { title: "Anfrage schicken", text: "Erzähl uns kurz, worum es geht: Standort, Anlass, gewünschter Umfang oder Rhythmus." },
  { title: "Rückmeldung", text: "Wir melden uns per E-Mail und klären offene Fragen." },
  { title: "Angebot", text: "Wenn wir deine Anfrage umsetzen können, bekommst du ein Angebot von uns." },
];

/** Settings values that still need to be filled in start with "[" (see settings.json). */
const isPlaceholder = (v: string) => v.trim().startsWith("[");

export default async function BusinessPage() {
  const settings = await getSettings();
  const { brand } = settings;

  return (
    <article>
      <PageHeader
        eyebrow={TITLE}
        title="Blumen für dein Unternehmen in Wien."
        intro="Blumen für Büro und Empfang, Geschenke für Kund:innen und Mitarbeiter:innen oder Blumen für eine Veranstaltung: Schreib uns, was du brauchst. Wir prüfen deine Anfrage und melden uns bei dir."
        crumbs={[{ label: TITLE }]}
        size="lg"
      />

      {/* What can be requested */}
      <section aria-labelledby="business-values-heading" className="container-x py-16 sm:py-20 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-3">Auf Anfrage</p>
            <h2 id="business-values-heading" className="display-2 max-w-md text-balance text-ink">Was du bei uns anfragen kannst.</h2>
          </div>
          <ul className="grid gap-8 sm:grid-cols-3 lg:col-span-8 lg:gap-6">
            {REQUESTS.map((v) => (
              <li key={v.title} className="border-t border-line pt-6 lg:pt-7">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-ivory-100 text-forest">
                  <v.icon className="size-[18px]" strokeWidth={1.4} aria-hidden />
                </span>
                <h3 className="mt-5 font-serif text-[24px] leading-tight text-ink">{v.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">{v.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How we work */}
      <section aria-labelledby="business-facts-heading" className="border-y border-line bg-ivory-100/70">
        <div className="container-x py-16 sm:py-20 lg:py-24">
          <div className="mb-10 max-w-2xl sm:mb-14">
            <p className="eyebrow mb-3">Gut zu wissen</p>
            <h2 id="business-facts-heading" className="display-2 text-balance text-ink">So arbeiten wir.</h2>
          </div>
          <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {GOOD_TO_KNOW.map((g) => (
              <li key={g.title} className="border-t border-line pt-5">
                <h3 className="font-serif text-[22px] leading-tight text-ink">{g.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{g.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Inquiry */}
      <section aria-labelledby="business-form-heading" className="container-x py-16 sm:py-20 lg:py-24">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-20">
          <div className="space-y-12">
            <div>
              <p className="eyebrow mb-3">Ablauf</p>
              <h2 className="display-3 text-ink">So geht es weiter</h2>
              <ol className="mt-8 divide-y divide-line border-y border-line">
                {NEXT_STEPS.map((s, i) => (
                  <li key={s.title} className="grid grid-cols-[auto_1fr] gap-x-5 py-5">
                    <span className="font-serif text-[15px] italic tracking-[0.04em] text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="text-[15px] font-semibold text-ink">{s.title}</p>
                      <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-md bg-ivory-100 p-6 sm:p-8">
              <p className="eyebrow mb-3">Lieber direkt?</p>
              <p className="text-[15px] leading-relaxed text-ink-muted">
                {isPlaceholder(brand.email) ? (
                  <>Alle Kontaktdaten findest du auf der <a href={routes.contact} className="text-forest underline underline-offset-4">Kontaktseite</a>.</>
                ) : (
                  <>Schreib uns an <a href={`mailto:${brand.email}`} className="text-forest underline underline-offset-4">{brand.email}</a>{!isPlaceholder(brand.phone) && <> oder ruf an: <a href={`tel:${brand.phone.replace(/[^\d+]/g, "")}`} className="text-forest underline underline-offset-4">{brand.phone}</a></>}.</>
                )}
              </p>
            </div>
          </div>

          <div id="anfrage" className="scroll-mt-24 rounded-md border border-line bg-white/70 p-6 shadow-soft sm:p-10">
            <p className="eyebrow mb-3">Anfrage</p>
            <h2 id="business-form-heading" className="display-3 text-ink">Erzähl uns, was du brauchst</h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">Je konkreter deine Angaben, desto besser können wir deine Anfrage einschätzen.</p>
            <BusinessInquiryForm className="mt-8" />
          </div>
        </div>
      </section>

      <JsonLd data={breadcrumbLd([{ name: "Start", url: "/" }, { name: TITLE, url: PATH }], settings)} />
    </article>
  );
}
