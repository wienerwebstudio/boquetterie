import type { Metadata } from "next";
import { Building2, CalendarDays, Gift, Hotel, MessagesSquare, Presentation, Receipt, Repeat, type LucideProps } from "lucide-react";
import { getSettings } from "@/lib/cms";
import { routes } from "@/lib/urls";
import { breadcrumbLd, JsonLd } from "@/lib/seo";
import { PageHeader } from "@/components/content/page-header";
import { BusinessInquiryForm } from "./business-inquiry-form";

const PATH = "/firmenkunden";
const TITLE = "Firmenkunden";

export const metadata: Metadata = {
  title: "Blumen für Firmenkunden – Büro, Empfang und Gastronomie",
  description: "Frische Blumen für Empfang, Meetingräume, Hotels und Events in Wien – regelmäßig oder einmalig, auf Wunsch mit Sammelrechnung und persönlicher Betreuung.",
  alternates: { canonical: PATH },
};

type Icon = React.ComponentType<LucideProps>;

const VALUES: { icon: Icon; title: string; text: string }[] = [
  {
    icon: Repeat,
    title: "Regelmäßige Lieferung",
    text: "Wöchentlich, alle zwei Wochen oder monatlich – du legst den Rhythmus fest, wir bringen frische Sträuße an deinen Standort. Umfang und Takt besprechen wir gemeinsam und passen sie an, wenn sich dein Bedarf ändert.",
  },
  {
    icon: Receipt,
    title: "Sammelrechnung",
    text: "Auf Wunsch fassen wir alle Lieferungen eines Monats in einer Rechnung zusammen – mit Kostenstelle oder Bestellnummer, wenn deine Buchhaltung das braucht.",
  },
  {
    icon: MessagesSquare,
    title: "Persönliche Betreuung",
    text: "Du hast eine Ansprechperson, die deine Räume, deinen Stil und dein Budget kennt – und die du direkt erreichst, wenn kurzfristig etwas gebraucht wird.",
  },
];

const USE_CASES: { icon: Icon; title: string; text: string }[] = [
  { icon: Building2, title: "Empfang", text: "Der erste Eindruck, wenn Gäste und Kund:innen ankommen." },
  { icon: Presentation, title: "Meetingräume", text: "Frische Akzente für Räume, in denen entschieden wird." },
  { icon: Hotel, title: "Hotels", text: "Lobby, Tische, Zimmer – abgestimmt auf dein Haus und deine Gäste." },
  { icon: CalendarDays, title: "Events", text: "Für Eröffnungen, Feiern und Konferenzen – einmalig und passend zum Anlass." },
  { icon: Gift, title: "Mitarbeiter:innen-Geschenke", text: "Zu Jubiläen, Geburtstagen oder einfach als Danke – auf Wunsch mit persönlicher Karte." },
];

const NEXT_STEPS = [
  { title: "Anfrage schicken", text: "Erzähl uns kurz, worum es geht: Standort, Räume, gewünschter Rhythmus." },
  { title: "Gespräch", text: "Wir melden uns per E-Mail oder Telefon und klären offene Fragen." },
  { title: "Angebot", text: "Du bekommst ein Angebot, das zu deinen Räumen und deinem Budget passt." },
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
        title="Blumen für Büro, Empfang und Gastronomie."
        intro="Frische Blumen für Räume, in denen Menschen ankommen, arbeiten und feiern. Regelmäßig oder einmalig – wir stimmen Auswahl, Rhythmus und Abrechnung auf dein Unternehmen ab."
        crumbs={[{ label: TITLE }]}
        size="lg"
        image={{ src: "/images/editorial/studio.jpg", alt: "Frisch gebundene Sträuße im Atelier, bereit für die Auslieferung" }}
      />

      {/* Value blocks */}
      <section aria-labelledby="business-values-heading" className="container-x py-16 sm:py-20 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-3">Was wir anbieten</p>
            <h2 id="business-values-heading" className="display-2 max-w-md text-balance text-ink">So einfach wie eine Bestellung. Nur regelmäßig.</h2>
          </div>
          <ul className="grid gap-8 sm:grid-cols-3 lg:col-span-8 lg:gap-6">
            {VALUES.map((v) => (
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

      {/* Use cases */}
      <section aria-labelledby="business-usecases-heading" className="border-y border-line bg-ivory-100/70">
        <div className="container-x py-16 sm:py-20 lg:py-24">
          <div className="mb-10 max-w-2xl sm:mb-14">
            <p className="eyebrow mb-3">Einsatzorte</p>
            <h2 id="business-usecases-heading" className="display-2 text-balance text-ink">Wo Blumen den Unterschied machen.</h2>
          </div>
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
            {USE_CASES.map((u) => (
              <li key={u.title} className="flex flex-col">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-white text-forest shadow-soft">
                  <u.icon className="size-[18px]" strokeWidth={1.4} aria-hidden />
                </span>
                <h3 className="mt-5 font-serif text-[22px] leading-tight text-ink">{u.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{u.text}</p>
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
              <p className="eyebrow mb-3">So geht es weiter</p>
              <h2 className="display-3 text-ink">Drei Schritte bis zum ersten Strauß</h2>
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
            <h2 id="business-form-heading" className="display-3 text-ink">Erzähl uns von deinen Räumen</h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">Je konkreter, desto schneller können wir ein passendes Angebot machen.</p>
            <BusinessInquiryForm className="mt-8" />
          </div>
        </div>
      </section>

      <JsonLd data={breadcrumbLd([{ name: "Start", url: "/" }, { name: TITLE, url: PATH }], settings)} />
    </article>
  );
}
