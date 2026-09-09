import type { Metadata } from "next";
import Image from "next/image";
import { getSettings, getSubscription } from "@/lib/cms";
import { JsonLd, breadcrumbLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { TrustIcon } from "@/components/icons/trust-icon";
import { SubscriptionPlanner } from "@/components/home/subscription-planner";
import { routes } from "@/lib/urls";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, config] = await Promise.all([getSettings(), getSubscription()]);
  const enabled = settings.subscriptionEnabled && config.enabled;
  return {
    title: enabled ? `Blumen-Abo – ${config.headline}` : "Blumen-Abo",
    description: enabled ? config.intro : "Das Blumen-Abo ist derzeit nicht verfügbar.",
    alternates: { canonical: routes.subscription },
    robots: enabled ? undefined : { index: false, follow: true },
  };
}

const STEPS = [
  { icon: "flower", title: "Abo wählen", text: "Small, Medium oder Large – je nachdem, wie viel Raum die Blumen bekommen sollen." },
  { icon: "calendar", title: "Rhythmus festlegen", text: "Wöchentlich, alle zwei Wochen oder monatlich. Pausieren ist jederzeit möglich." },
  { icon: "mail", title: "Anfrage senden", text: "Wir melden uns mit allen Details und stimmen Lieferort und Starttermin mit dir ab." },
];

export default async function SubscriptionPage() {
  const [settings, config] = await Promise.all([getSettings(), getSubscription()]);
  const enabled = settings.subscriptionEnabled && config.enabled;

  if (!enabled) {
    return (
      <section className="container-x py-20 sm:py-28 lg:py-36">
        <div className="mx-auto max-w-xl text-center">
          <p className="eyebrow mb-4">Blumen-Abo</p>
          <h1 className="display-2 text-balance text-ink">Das Blumen-Abo ist derzeit nicht verfügbar.</h1>
          <p className="mt-4 text-[15.5px] leading-relaxed text-ink-muted">Wir arbeiten daran. Bis dahin findest du frische Sträuße für jeden Anlass im Shop.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href={routes.shop} size="lg">Blumen entdecken</Button>
            <Button href={routes.contact} size="lg" variant="outline">Kontakt</Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Blumen-Abo", url: routes.subscription }], settings)} />

      {/* Hero */}
      <section className="container-x pt-6 sm:pt-8">
        <Breadcrumbs items={[{ label: "Blumen-Abo" }]} />
        <div className="grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-12 lg:gap-14 lg:py-16">
          <div className="lg:col-span-6">
            <p className="eyebrow mb-4">Blumen-Abo</p>
            <h1 className="display-1 max-w-[12ch] text-balance text-ink">{config.headline}</h1>
            <p className="mt-5 max-w-lg text-pretty text-[15.5px] leading-relaxed text-ink-muted sm:text-[17px]">{config.intro}</p>
            {config.audiences.length > 0 && (
              <ul className="mt-7 flex flex-wrap gap-2" aria-label="Für wen">
                {config.audiences.map((a) => (
                  <li key={a} className="inline-flex h-9 items-center rounded-full border border-line bg-white px-4 text-[13.5px] font-medium text-ink">{a}</li>
                ))}
              </ul>
            )}
            <div className="mt-8">
              <Button href="#abo-plaene" size="lg">Abo auswählen</Button>
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-ivory-200 sm:aspect-[3/2] lg:aspect-[4/5]">
              <Image src={config.image} alt="Saisonaler Strauß aus dem Blumen-Abo" fill sizes="(min-width: 1440px) 640px, (min-width: 1024px) 50vw, 100vw" className="object-cover" fetchPriority="high" />
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="abo-plaene" aria-labelledby="plans-title" className="scroll-mt-24 bg-ivory-100 py-16 sm:py-20 lg:py-24">
        <div className="container-x">
          <div className="mb-10 max-w-2xl sm:mb-12">
            <p className="eyebrow mb-3">Abo-Größen</p>
            <h2 id="plans-title" className="display-2 text-balance text-ink">Welches Abo passt zu dir?</h2>
            <p className="mt-3 text-[15px] text-ink-muted sm:text-base">Preise verstehen sich pro Lieferung inklusive Lieferung in unserem Liefergebiet. Rabatte je nach Rhythmus.</p>
          </div>
          <SubscriptionPlanner config={config} />
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="abo-how-title" className="py-16 sm:py-20 lg:py-24">
        <div className="container-x">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-4">
              <p className="eyebrow mb-3">Wie es funktioniert</p>
              <h2 id="abo-how-title" className="display-2 max-w-md text-balance text-ink">Drei Schritte bis zum ersten Strauß.</h2>
            </div>
            <ol className="grid gap-8 sm:grid-cols-3 lg:col-span-8 lg:gap-6">
              {STEPS.map((s, i) => (
                <li key={s.title} className="border-t border-line pt-6">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-[15px] italic tracking-[0.04em] text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
                    <span className="inline-flex size-10 items-center justify-center rounded-full bg-ivory-100 text-forest"><TrustIcon name={s.icon} className="size-[18px]" /></span>
                  </div>
                  <h3 className="mt-5 font-serif text-[24px] leading-tight text-ink">{s.title}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
