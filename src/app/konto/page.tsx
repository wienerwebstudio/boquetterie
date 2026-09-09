import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart, Package, User } from "lucide-react";
import { getSettings } from "@/lib/cms";
import { routes } from "@/lib/urls";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { FavoritesGrid } from "@/components/account/favorites-grid";

export const metadata: Metadata = {
  title: "Mein Konto",
  robots: { index: false, follow: true },
};

export default async function AccountPage() {
  const settings = await getSettings();
  return (
    <div className="container-x py-10 lg:py-16">
      <Breadcrumbs items={[{ label: "Mein Konto" }]} className="mb-8" />
      <header className="max-w-2xl">
        <p className="eyebrow mb-3">Mein Konto</p>
        <h1 className="display-2 text-ink">Deine Blumen, deine Bestellungen.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
          Für das Bestellen brauchst du kein Konto. Deine Favoriten merken wir uns auf diesem Gerät; den Status einer Bestellung rufst du mit Bestellnummer und E-Mail-Adresse ab.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link href={routes.tracking} className="group flex items-start gap-4 rounded-lg border border-line bg-white/60 p-6 transition-colors hover:border-forest">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ivory-200 text-forest"><Package className="size-5" strokeWidth={1.5} aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 font-serif text-[22px] text-ink">Bestellung verfolgen <ArrowRight className="size-4 text-forest transition-transform group-hover:translate-x-1" aria-hidden /></span>
            <span className="mt-1 block text-[14px] text-ink-muted">Status abrufen – vom Binden bis zur Zustellung.</span>
          </span>
        </Link>
        <div className="flex items-start gap-4 rounded-lg border border-dashed border-stone bg-ivory-100/60 p-6" aria-describedby="account-placeholder">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ivory-200 text-ink-muted"><User className="size-5" strokeWidth={1.5} aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 font-serif text-[22px] text-ink">Kundenkonto <Badge tone="outline">In Vorbereitung</Badge></p>
            <p id="account-placeholder" className="mt-1 text-[14px] leading-relaxed text-ink-muted">
              Ein Kundenkonto mit Bestellhistorie, gespeicherten Adressen und Erinnerungen an wichtige Daten ist geplant, aber noch nicht verfügbar. Bis dahin kommst du ohne Anmeldung aus.
            </p>
          </div>
        </div>
      </div>

      {settings.favoritesEnabled && (
        <section aria-labelledby="favorites-title" className="mt-14 lg:mt-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-2 flex items-center gap-1.5"><Heart className="size-3.5" aria-hidden /> Gemerkt</p>
              <h2 id="favorites-title" className="display-3 text-ink">Deine Favoriten</h2>
            </div>
            <Link href={routes.shop} className="hidden shrink-0 items-center gap-2 text-sm font-semibold text-forest sm:inline-flex">Alle Blumen <ArrowRight className="size-4" aria-hidden /></Link>
          </div>
          <FavoritesGrid />
          <p className="mt-6 text-[12.5px] text-ink-soft">Favoriten werden nur in diesem Browser gespeichert.</p>
        </section>
      )}
    </div>
  );
}
