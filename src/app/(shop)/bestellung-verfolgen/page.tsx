import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/cms";
import { routes } from "@/lib/urls";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { TrackingForm } from "@/components/checkout/tracking-form";

export const metadata: Metadata = {
  title: "Bestellung verfolgen",
  description: "Sendungsverfolgung: Status deiner Blumenbestellung mit Bestellnummer und E-Mail-Adresse abrufen.",
  alternates: { canonical: routes.tracking },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function TrackingPage({ searchParams }: Props) {
  const [sp, settings] = await Promise.all([searchParams, getSettings()]);
  const initial = typeof sp.nr === "string" ? sp.nr : "";
  const contactEmail = settings.brand.email.startsWith("[") ? null : settings.brand.email;

  return (
    <div className="container-x py-10 lg:py-16">
      <Breadcrumbs items={[{ label: "Bestellung verfolgen" }]} className="mb-8" />
      <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <div className="max-w-xl">
          <p className="eyebrow mb-3">Sendungsverfolgung</p>
          <h1 className="display-2 text-ink">Wo ist mein Strauß?</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
            Gib deine Bestellnummer und die E-Mail-Adresse ein, mit der du bestellt hast. Du siehst dann, in welchem Schritt sich dein Strauß gerade befindet – vom Binden bis zur Zustellung.
          </p>
          <div className="mt-8">
            <TrackingForm initialOrderId={initial} />
          </div>
        </div>
        <aside className="self-start rounded-lg bg-ivory-100 p-6 text-[14px] leading-relaxed text-ink-muted sm:p-8">
          <p className="font-semibold text-ink">Gut zu wissen</p>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-5">
            <li>Deine Bestellnummer beginnt mit <span className="font-semibold text-ink">BQ-</span> und steht in deiner Bestellbestätigung.</li>
            <li>Den direkten Link zur Statusseite findest du ebenfalls in der Bestellbestätigung per E-Mail.</li>
            <li>Der Empfänger erhält keine Statusmeldungen – die Überraschung bleibt eine Überraschung.</li>
          </ul>
          <p className="mt-5">
            Keine Bestätigung erhalten?{" "}
            {contactEmail
              ? <>Schreib uns an <a href={`mailto:${contactEmail}`} className="font-semibold text-forest underline underline-offset-2">{contactEmail}</a>.</>
              : <><Link href={routes.contact} className="font-semibold text-forest underline underline-offset-2">Kontaktiere uns</Link> – wir helfen gern.</>}
          </p>
        </aside>
      </div>
    </div>
  );
}
