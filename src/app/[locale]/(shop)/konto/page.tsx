import type { Metadata } from "next";
import Link from "@/components/ui/link";
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
import { getCapabilities } from "@/lib/capabilities";
import { getI18n } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return {
    title: m.account.metaTitle,
    robots: { index: false, follow: true },
  };
}

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

async function FavoritesSection() {
  const t = (await getI18n()).m.account.sections;
  return (
    <section aria-labelledby="favoriten" className="scroll-mt-32">
      <SectionTitle id="favoriten" icon={Heart} eyebrow={t.favoritesEyebrow} title={t.favoritesTitle} link={{ href: routes.shop, label: t.allFlowers }} />
      <FavoritesGrid />
      <p className="mt-6 text-[12.5px] text-ink-soft">{t.favoritesNote}</p>
    </section>
  );
}

export default async function AccountPage({ searchParams }: Props) {
  const [settings, customer, sp, { m, fmt }] = await Promise.all([getSettings(), getCurrentCustomer(), searchParams, getI18n()]);
  const t = m.account;

  /* ---------------- Logged out ---------------- */
  if (!customer) {
    const loginAvailable = isAuthConfigured() && (await getCapabilities()).accountLogin;
    const notice = !loginAvailable
      ? t.loggedOut.loginUnavailable
      : sp.abgemeldet === "1" ? t.loggedOut.loggedOut : undefined;
    return (
      <div className="pb-16 lg:pb-24">
        <PageHeader
          crumbs={[{ label: t.title }]}
          eyebrow={t.title}
          title={t.loggedOut.title}
          intro={t.loggedOut.intro}
        />
        <div className="container-x mt-10 grid gap-4 lg:mt-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6">
          <LoginCard notice={notice} unavailable={!loginAvailable} />
          <div className="grid content-start gap-4">
            <Link href={routes.tracking} className="group flex items-start gap-4 rounded-lg border border-line bg-white/60 p-6 transition-colors hover:border-forest">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ivory-200 text-forest"><Package className="size-5" strokeWidth={1.5} aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-serif text-[22px] text-ink">{t.loggedOut.trackTitle} <ArrowRight className="size-4 text-forest transition-transform group-hover:translate-x-1" aria-hidden /></span>
                <span className="mt-1 block text-[14px] text-ink-muted">{t.loggedOut.trackText}</span>
              </span>
            </Link>
            <div className="rounded-lg border border-line bg-ivory-100/60 p-6">
              <p className="font-serif text-[22px] text-ink">{t.loggedOut.featuresTitle}</p>
              <ul className="mt-3 grid gap-2 text-[14px] text-ink-muted">
                <li className="flex gap-2"><Package className="mt-0.5 size-4 shrink-0 text-forest" strokeWidth={1.5} aria-hidden />{t.loggedOut.featureOrders}</li>
                <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-forest" strokeWidth={1.5} aria-hidden />{t.loggedOut.featureRecipients}</li>
                <li className="flex gap-2"><Bell className="mt-0.5 size-4 shrink-0 text-forest" strokeWidth={1.5} aria-hidden />{t.loggedOut.featureReminders}</li>
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
        crumbs={[{ label: t.title }]}
        eyebrow={welcome ? t.loggedIn.welcomeEyebrow : t.title}
        title={name ? fmt(t.loggedIn.hello, { name }) : t.loggedIn.helloAnonymous}
        intro={fmt(t.loggedIn.intro, { email: customer.email })}
      />
      <div className="container-x mt-10 flex flex-col gap-14 lg:mt-14 lg:gap-20">
        <AccountNav showFavorites={settings.favoritesEnabled} />

        <section aria-labelledby="bestellungen" className="scroll-mt-32">
          <SectionTitle id="bestellungen" icon={Package} eyebrow={t.sections.ordersEyebrow} title={t.sections.ordersTitle} />
          <OrdersList orders={orders} statuses={settings.orderStatuses} />
          <p className="mt-4 text-[12.5px] text-ink-soft">{fmt(t.sections.ordersNote, { email: customer.email })}</p>
        </section>

        <section aria-labelledby="empfaenger" className="scroll-mt-32">
          <SectionTitle id="empfaenger" icon={MapPin} eyebrow={t.sections.recipientsEyebrow} title={t.sections.recipientsTitle} />
          <RecipientsList recipients={recipients} />
        </section>

        {settings.favoritesEnabled && <FavoritesSection />}

        <section aria-labelledby="profil" className="scroll-mt-32">
          <SectionTitle id="profil" icon={UserRound} eyebrow={t.sections.profileEyebrow} title={t.sections.profileTitle} />
          <ProfileForm customer={customer} action={updateProfileAction} />
        </section>

        <section aria-labelledby="erinnerungen" className="scroll-mt-32">
          <Link href="/erinnerung" className="group flex items-start gap-4 rounded-lg border border-line bg-white/60 p-6 transition-colors hover:border-forest sm:p-8">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ivory-200 text-forest"><Bell className="size-5" strokeWidth={1.5} aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span id="erinnerungen" className="flex items-center gap-2 font-serif text-[22px] text-ink">{t.sections.remindersTitle} <ArrowRight className="size-4 text-forest transition-transform group-hover:translate-x-1" aria-hidden /></span>
              <span className="mt-1 block text-[14px] text-ink-muted">{t.sections.remindersText}</span>
            </span>
          </Link>
        </section>
      </div>
    </div>
  );
}
