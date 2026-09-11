import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, Heart, MapPin, Package, UserRound } from "lucide-react";
import { getOrdersByEmail, getSettings } from "@/lib/cms";
import { getCurrentCustomer, isAuthConfigured } from "@/lib/auth";
import { routes } from "@/lib/urls";
import { PageHeader } from "@/components/content/page-header";
import { FavoritesGrid } from "@/components/account/favorites-grid";
import { LoginCard } from "@/components/account/login-card";
import { AccountNav } from "@/components/account/account-nav";
import { OrdersList } from "@/components/account/orders-list";
import { deriveRecipients, RecipientsList } from "@/components/account/recipients-list";
import { ProfileForm } from "@/components/account/profile-form";
import { updateProfileAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mein Konto",
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function SectionTitle({ id, icon: Icon, eyebrow, title, link }: { id: string; icon: typeof Package; eyebrow: string; title: string; link?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="eyebrow mb-2 flex items-center gap-1.5"><Icon className="size-3.5" aria-hidden /> {eyebrow}</p>
        <h2 id={id} className="display-3 text-ink">{title}</h2>
      </div>
      {link && <Link href={link.href} className="hidden shrink-0 items-center gap-2 text-sm font-semibold text-forest sm:inline-flex">{link.label} <ArrowRight className="size-4" aria-hidden /></Link>}
    </div>
  );
}

function FavoritesSection() {
  return (
    <section aria-labelledby="favoriten" className="scroll-mt-32">
      <SectionTitle id="favoriten" icon={Heart} eyebrow="Gemerkt" title="Deine Favoriten" link={{ href: routes.shop, label: "Alle Blumen" }} />
      <FavoritesGrid />
      <p className="mt-6 text-[12.5px] text-ink-soft">Favoriten werden nur in diesem Browser gespeichert.</p>
    </section>
  );
}

export default async function AccountPage({ searchParams }: Props) {
  const [settings, customer, sp] = await Promise.all([getSettings(), getCurrentCustomer(), searchParams]);

  /* ---------------- Logged out ---------------- */
  if (!customer) {
    const notice = !isAuthConfigured()
      ? "Der Login ist auf diesem System noch nicht eingerichtet (AUTH_SECRET fehlt). Bestellen und Bestellung verfolgen funktionieren weiterhin ohne Konto."
      : sp.abgemeldet === "1" ? "Du bist abgemeldet. Bis zum nächsten Mal." : undefined;
    return (
      <div className="pb-16 lg:pb-24">
        <PageHeader
          crumbs={[{ label: "Mein Konto" }]}
          eyebrow="Mein Konto"
          title="Deine Blumen, deine Bestellungen."
          intro="Ein Konto brauchst du zum Bestellen nicht. Wenn du eines möchtest: Es gibt kein Passwort – du bekommst bei jedem Login einen Link per E-Mail."
        />
        <div className="container-x mt-10 grid gap-4 lg:mt-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6">
          <LoginCard notice={notice} />
          <div className="grid content-start gap-4">
            <Link href={routes.tracking} className="group flex items-start gap-4 rounded-lg border border-line bg-white/60 p-6 transition-colors hover:border-forest">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ivory-200 text-forest"><Package className="size-5" strokeWidth={1.5} aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-serif text-[22px] text-ink">Bestellung verfolgen <ArrowRight className="size-4 text-forest transition-transform group-hover:translate-x-1" aria-hidden /></span>
                <span className="mt-1 block text-[14px] text-ink-muted">Ohne Login – mit Bestellnummer und E-Mail-Adresse.</span>
              </span>
            </Link>
            <div className="rounded-lg border border-line bg-ivory-100/60 p-6">
              <p className="font-serif text-[22px] text-ink">Was dein Konto kann</p>
              <ul className="mt-3 grid gap-2 text-[14px] text-ink-muted">
                <li className="flex gap-2"><Package className="mt-0.5 size-4 shrink-0 text-forest" strokeWidth={1.5} aria-hidden />Alle Bestellungen und ihren Status auf einen Blick</li>
                <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-forest" strokeWidth={1.5} aria-hidden />Empfänger:innen, denen du schon Blumen geschickt hast</li>
                <li className="flex gap-2"><Bell className="mt-0.5 size-4 shrink-0 text-forest" strokeWidth={1.5} aria-hidden />Erinnerungen an Geburtstage und Jahrestage</li>
              </ul>
            </div>
          </div>
        </div>
        {settings.favoritesEnabled && <div className="container-x mt-14 lg:mt-20"><FavoritesSection /></div>}
      </div>
    );
  }

  /* ---------------- Logged in ---------------- */
  const orders = (await getOrdersByEmail(customer.email)).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const recipients = deriveRecipients(orders);
  const name = customer.firstName?.trim() || null;
  const welcome = sp.willkommen === "1";

  return (
    <div className="pb-16 lg:pb-24">
      <PageHeader
        crumbs={[{ label: "Mein Konto" }]}
        eyebrow={welcome ? "Schön, dass du da bist" : "Mein Konto"}
        title={name ? `Hallo ${name}.` : "Hallo."}
        intro={`Du bist angemeldet als ${customer.email}. Hier findest du deine Bestellungen, Empfänger:innen und dein Profil.`}
      />
      <div className="container-x mt-10 flex flex-col gap-14 lg:mt-14 lg:gap-20">
        <AccountNav showFavorites={settings.favoritesEnabled} />

        <section aria-labelledby="bestellungen" className="scroll-mt-32">
          <SectionTitle id="bestellungen" icon={Package} eyebrow="Bestellhistorie" title="Deine Bestellungen" />
          <OrdersList orders={orders} statuses={settings.orderStatuses} />
          <p className="mt-4 text-[12.5px] text-ink-soft">Wir zeigen alle Bestellungen, die mit {customer.email} aufgegeben wurden.</p>
        </section>

        <section aria-labelledby="empfaenger" className="scroll-mt-32">
          <SectionTitle id="empfaenger" icon={MapPin} eyebrow="Adressbuch" title="Empfänger:innen" />
          <RecipientsList recipients={recipients} />
        </section>

        {settings.favoritesEnabled && <FavoritesSection />}

        <section aria-labelledby="profil" className="scroll-mt-32">
          <SectionTitle id="profil" icon={UserRound} eyebrow="Deine Daten" title="Profil" />
          <ProfileForm customer={customer} action={updateProfileAction} />
        </section>

        <section aria-labelledby="erinnerungen" className="scroll-mt-32">
          <Link href="/erinnerung" className="group flex items-start gap-4 rounded-lg border border-line bg-white/60 p-6 transition-colors hover:border-forest sm:p-8">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ivory-200 text-forest"><Bell className="size-5" strokeWidth={1.5} aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span id="erinnerungen" className="flex items-center gap-2 font-serif text-[22px] text-ink">Erinnerungen <ArrowRight className="size-4 text-forest transition-transform group-hover:translate-x-1" aria-hidden /></span>
              <span className="mt-1 block text-[14px] text-ink-muted">Lass dich rechtzeitig an Geburtstage, Jahrestage und den Muttertag erinnern.</span>
            </span>
          </Link>
        </section>
      </div>
    </div>
  );
}
