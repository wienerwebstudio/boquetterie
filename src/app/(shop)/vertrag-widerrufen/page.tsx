import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";
import { routes } from "@/lib/urls";
import { PageHeader } from "@/components/content/page-header";
import { WithdrawalForm } from "@/components/content/withdrawal-form";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Vertrag widerrufen",
    description: "Widerruf eines Kaufvertrags bei Blumora online erklären – mit sofortiger Eingangsbestätigung per E-Mail.",
    path: routes.legal.withdrawalForm,
  });
}

/** The website's withdrawal function (FAGG / Art. 11a Consumer Rights Directive). */
export default function WithdrawalPage() {
  return (
    <article>
      <PageHeader
        eyebrow="Rechtliches"
        title="Vertrag widerrufen"
        intro="Hier erklärst du den Widerruf eines Kaufvertrags. Du bekommst sofort eine Eingangsbestätigung mit Datum und Uhrzeit per E-Mail."
        crumbs={[{ label: "Widerrufsbelehrung", href: routes.legal.withdrawal }, { label: "Vertrag widerrufen" }]}
      />
      <div className="container-x grid gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16">
        <WithdrawalForm />
        <aside className="h-fit rounded-md border border-line bg-ivory-100/70 p-5 text-[14px] leading-relaxed text-ink-muted sm:p-6">
          <p className="font-semibold text-ink">Gut zu wissen</p>
          <p className="mt-2">
            Für frische Schnittblumen und Blumensträuße besteht nach § 18 Abs. 1 Z 4 FAGG kein Widerrufsrecht. Für andere Waren, etwa Teddybären, Duftkerzen oder nicht schnell verderbliche Topfpflanzen, kannst du innerhalb von 14 Tagen ab Erhalt widerrufen.
          </p>
          <p className="mt-3">
            Alle Einzelheiten stehen in der <Link href={routes.legal.withdrawal}>Widerrufsbelehrung</Link>. Du kannst uns deinen Widerruf auch formlos per E-Mail an office@blumora.at schicken.
          </p>
        </aside>
      </div>
    </article>
  );
}
