import Link from "next/link";
import type { SiteSettings } from "@/types";
import { Logo } from "@/components/icons/logo";
import { PaymentMark } from "@/components/icons/payment";
import { routes } from "@/lib/urls";

export function Footer({ settings }: { settings: SiteSettings }) {
  const cols = [
    { title: "Shop", links: [
      { label: "Blumen", href: routes.shop }, { label: "Bestseller", href: routes.category("bestseller") },
      { label: "Rosen", href: routes.category("rosen") }, { label: "Geschenksets", href: routes.extras },
      ...(settings.subscriptionEnabled ? [{ label: "Blumen-Abo", href: routes.subscription }] : []),
    ] },
    { title: "Anlässe", links: [
      { label: "Geburtstag", href: routes.occasion("geburtstag") }, { label: "Liebe", href: routes.occasion("liebe") },
      { label: "Danke", href: routes.occasion("danke") }, { label: "Gute Besserung", href: routes.occasion("gute-besserung") },
      { label: "Hochzeit", href: routes.occasion("hochzeit") }, { label: "Trauer", href: routes.occasion("trauer") },
    ] },
    { title: "Service", links: [
      { label: "Lieferung", href: routes.delivery }, { label: "FAQ", href: routes.faq },
      { label: "Kontakt", href: routes.contact }, { label: "Bestellung verfolgen", href: routes.tracking },
    ] },
    { title: "Unternehmen", links: [
      { label: "Über uns", href: routes.about }, { label: "Impressum", href: routes.legal.imprint },
      { label: "Datenschutz", href: routes.legal.privacy }, { label: "AGB", href: routes.legal.terms },
      { label: "Widerruf", href: routes.legal.withdrawal },
    ] },
  ];
  const payments = settings.payments.filter((p) => p.enabled);
  return (
    <footer className="border-t border-line bg-ivory-100">
      <div className="container-x py-14 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">{settings.brand.claim} Frisch gebunden in Wien, persönlich geliefert.</p>
            <div className="mt-6 flex gap-2">
              {settings.brand.social.instagram && (
                <a href={settings.brand.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="inline-flex size-10 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-forest hover:text-forest"><svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle cx="17.3" cy="6.7" r="0.8" fill="currentColor"/></svg></a>
              )}
              {settings.brand.social.facebook && (
                <a href={settings.brand.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="inline-flex size-10 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-forest hover:text-forest"><svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M14 8h2.5V4.5H14a3.5 3.5 0 0 0-3.5 3.5v2H8v3.5h2.5V21H14v-7.5h2.5L17 10h-3V8.5c0-.3.2-.5.5-.5z"/></svg></a>
              )}
            </div>
          </div>
          {cols.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="eyebrow mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}><Link href={l.href} className="text-[14.5px] text-ink transition-colors hover:text-forest">{l.label}</Link></li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-6 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {payments.map((p) => <PaymentMark key={p.id} id={p.id} />)}
            <span className="ml-2 text-[12px] text-ink-soft">Sichere Zahlung · SSL-verschlüsselt</span>
          </div>
          <p className="text-[12px] text-ink-soft">© {new Date().getFullYear()} {settings.brand.name}. {settings.brand.address.city}, {settings.brand.address.country}.</p>
        </div>
      </div>
    </footer>
  );
}
