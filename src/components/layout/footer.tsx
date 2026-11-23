import Link from "@/components/ui/link";
import type { SiteSettings } from "@/types";
import { Logo } from "@/components/icons/logo";
import { PaymentMark } from "@/components/icons/payment";
import { routes } from "@/lib/urls";
import { ordersPaused } from "@/lib/orders-paused";
import { ConsentSettingsLink } from "@/components/consent/consent-link";
import { GIFT_FINDER_PATH } from "@/components/giftfinder/config";
import { SMALL_BUSINESS } from "@/lib/vat";
import { getI18n } from "@/i18n/server";
import { footerSocialLinks } from "@/lib/social";
import { SocialMark } from "@/components/icons/social";

type FooterLink = { label: string; href: string } | { label: string; consent: true };

export async function Footer({ settings }: { settings: SiteSettings }) {
  const { m, fmt } = await getI18n();
  const social = footerSocialLinks(settings);
  const nav = m.layout.nav;
  const t = m.layout.footer;
  const cols: { title: string; links: FooterLink[] }[] = [
    { title: t.columns.shop, links: [
      { label: nav.flowers, href: routes.shop }, { label: nav.plants, href: routes.category("pflanzen") },
      { label: nav.roses, href: routes.category("rosen") }, { label: nav.extras, href: routes.extras },
      ...(settings.subscriptionEnabled ? [{ label: nav.subscription, href: routes.subscription }] : []),
    ] },
    { title: t.columns.occasions, links: [
      { label: t.links.birthday, href: routes.occasion("geburtstag") }, { label: t.links.love, href: routes.occasion("liebe") },
      { label: t.links.thanks, href: routes.occasion("danke") }, { label: t.links.getWell, href: routes.occasion("gute-besserung") },
      { label: t.links.wedding, href: routes.occasion("hochzeit") }, { label: t.links.sympathy, href: routes.occasion("trauer") },
    ] },
    { title: t.columns.service, links: [
      { label: nav.delivery, href: routes.delivery }, { label: t.links.faq, href: routes.faq },
      { label: t.links.contact, href: routes.contact }, { label: t.links.trackOrder, href: routes.tracking },
      { label: t.links.giftFinder, href: GIFT_FINDER_PATH }, { label: t.links.reminder, href: "/erinnerung" },
    ] },
    { title: t.columns.company, links: [
      { label: nav.about, href: routes.about }, { label: t.links.business, href: "/firmenkunden" },
      { label: t.links.imprint, href: routes.legal.imprint },
      { label: t.links.privacy, href: routes.legal.privacy }, { label: t.links.terms, href: routes.legal.terms },
      { label: t.links.withdrawal, href: routes.legal.withdrawal },
      { label: t.links.withdrawalForm, href: routes.legal.withdrawalForm },
      { label: t.links.cookieSettings, consent: true },
    ] },
  ];
  const linkCls = "inline-flex min-h-7 items-center text-left text-[14.5px] text-ink transition-colors hover:text-forest";
  // No payment marks while ordering is paused – nothing can be paid yet.
  const payments = ordersPaused() ? [] : settings.payments.filter((p) => p.enabled);
  return (
    <footer className="border-t border-line bg-ivory-100">
      <div className="container-x py-14 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo variant="stacked" />
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">{settings.brand.claim} {t.claimSuffix}</p>
            {social.length > 0 && (
              <nav aria-label={m.layout.social.navigation} className="mt-6">
                <ul className="-ms-1.5 flex flex-wrap gap-1">
                  {social.map((s) => (
                    <li key={s.key}>
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={fmt(m.layout.social.profile, { name: s.name })}
                        title={s.name}
                        data-social={s.key}
                        className="inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-ivory-200 hover:text-forest"
                      >
                        <SocialMark network={s.key} className="size-5" />
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
          {cols.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="eyebrow mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {"consent" in l
                      ? <ConsentSettingsLink className={linkCls}>{l.label}</ConsentSettingsLink>
                      : <Link href={l.href} className={linkCls}>{l.label}</Link>}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-6 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {payments.map((p) => <PaymentMark key={p.id} id={p.id} />)}
            {payments.length > 0 && <span className="ml-2 text-[12px] text-ink-soft">{t.securePayment}</span>}
          </div>
          <p className="text-[12px] text-ink-soft">© {new Date().getFullYear()} {settings.brand.name}. {settings.brand.address.city}, {settings.brand.address.country}. {m.cart.vat[SMALL_BUSINESS ? "smallBusiness" : "standard"].note}</p>
        </div>
      </div>
    </footer>
  );
}
