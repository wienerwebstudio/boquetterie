"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, User, ShoppingBag, Menu, X, ChevronDown, ArrowRight } from "lucide-react";
import type { SiteSettings } from "@/types";
import { Logo } from "@/components/icons/logo";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useCart, cartCount } from "@/store/cart";
import { useUi } from "@/store/ui";
import { routes } from "@/lib/urls";
import { cn } from "@/lib/format";
import { Drawer } from "@/components/ui/drawer";

interface NavCategory { slug: string; name: string }
interface NavOccasion { slug: string; name: string; image: string }

export function Header({ settings, categories, occasions }: { settings: SiteSettings; categories: NavCategory[]; occasions: NavOccasion[] }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState<"blumen" | "anlaesse" | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const items = useCart((s) => s.items);
  const hydrated = useCart((s) => s.hydrated);
  const { openCart, openSearch, menuOpen, setMenuOpen } = useUi();
  const count = hydrated ? cartCount(items) : 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { setMega(null); setMenuOpen(false); }, [pathname, setMenuOpen]);

  const open = (key: "blumen" | "anlaesse") => { if (closeTimer.current) clearTimeout(closeTimer.current); setMega(key); };
  const scheduleClose = () => { closeTimer.current = setTimeout(() => setMega(null), 120); };

  const primaryNav: { label: string; href: string; mega?: "blumen" | "anlaesse" }[] = [
    { label: "Blumen", href: routes.shop, mega: "blumen" },
    { label: "Anlässe", href: routes.occasions, mega: "anlaesse" },
    { label: "Rosen", href: routes.category("rosen") },
    { label: "Bestseller", href: routes.category("bestseller") },
    { label: "Geschenksets", href: routes.extras },
    ...(settings.subscriptionEnabled ? [{ label: "Blumen-Abo", href: routes.subscription }] : []),
    { label: "Lieferung", href: routes.delivery },
    { label: "Über uns", href: routes.about },
  ];

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className={cn("sticky top-0 z-50 bg-ivory/90 backdrop-blur-md transition-shadow duration-300", scrolled ? "shadow-[0_1px_0_var(--color-line),0_10px_30px_-20px_rgba(35,35,31,0.25)]" : "shadow-[0_1px_0_var(--color-line)]")} onMouseLeave={scheduleClose}>
      <div className="container-x flex h-16 items-center justify-between gap-4 lg:h-[72px]">
        <div className="flex items-center gap-2 lg:hidden">
          <IconButton label="Menü öffnen" onClick={() => setMenuOpen(true)}><Menu className="size-5" strokeWidth={1.6} /></IconButton>
        </div>

        <Link href="/" className="shrink-0" aria-label="Boquetterie – Startseite">
          <Logo />
        </Link>

        <nav aria-label="Hauptnavigation" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {primaryNav.map((item) => (
              <li key={item.href} onMouseEnter={() => (item.mega ? open(item.mega) : setMega(null))}>
                <Link
                  href={item.href}
                  aria-expanded={item.mega ? mega === item.mega : undefined}
                  onFocus={() => item.mega && open(item.mega)}
                  className={cn("inline-flex h-10 items-center gap-1 rounded-md px-3 text-[13.5px] font-medium tracking-[0.01em] text-ink transition-colors hover:text-forest", isActive(item.href) && "text-forest")}
                >
                  {item.label}
                  {item.mega && <ChevronDown className={cn("size-3.5 text-ink-soft transition-transform duration-300", mega === item.mega && "rotate-180")} aria-hidden />}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <IconButton label="Suche" onClick={openSearch}><Search className="size-5" strokeWidth={1.6} /></IconButton>
          <Link href={routes.account} aria-label="Mein Konto" className="hidden size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-ivory-200 hover:text-forest sm:inline-flex">
            <User className="size-5" strokeWidth={1.6} />
          </Link>
          <button onClick={openCart} aria-label={`Warenkorb, ${count} Artikel`} className="relative inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-ivory-200 hover:text-forest">
            <ShoppingBag className="size-5" strokeWidth={1.6} />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-[18px] items-center justify-center rounded-full bg-forest text-[10px] font-bold text-ivory animate-fade-in">{count}</span>
            )}
          </button>
          {settings.headerCta.enabled && (
            <div className="ml-2 hidden xl:block">
              <Button href={settings.headerCta.href} size="sm">{settings.headerCta.label}</Button>
            </div>
          )}
        </div>
      </div>

      {/* Mega menu */}
      <div
        className={cn("absolute inset-x-0 top-full hidden border-t border-line bg-ivory shadow-lift transition-all duration-300 lg:block", mega ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0")}
        onMouseEnter={() => mega && open(mega)}
        onMouseLeave={scheduleClose}
        aria-hidden={!mega}
      >
        <div className="container-x py-8">
          {mega === "blumen" && (
            <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-10">
              <div>
                <p className="eyebrow mb-4">Kollektionen</p>
                <ul className="space-y-2.5">
                  {categories.map((c) => (
                    <li key={c.slug}><Link href={routes.category(c.slug)} className="text-[15px] text-ink hover:text-forest">{c.name}</Link></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow mb-4">Schnell zu</p>
                <ul className="space-y-2.5">
                  <li><Link href={`${routes.shop}?sort=new`} className="text-[15px] text-ink hover:text-forest">Neu im Sortiment</Link></li>
                  <li><Link href={`${routes.shop}?sameday=1`} className="text-[15px] text-ink hover:text-forest">Heute lieferbar</Link></li>
                  <li><Link href={routes.extras} className="text-[15px] text-ink hover:text-forest">Geschenksets & Extras</Link></li>
                  {settings.subscriptionEnabled && <li><Link href={routes.subscription} className="text-[15px] text-ink hover:text-forest">Blumen-Abo</Link></li>}
                </ul>
              </div>
              <Link href={routes.category("bestseller")} className="group relative block aspect-[16/9] overflow-hidden rounded-md bg-ivory-200">
                <Image src="/images/products/amour-3.jpg" alt="" fill sizes="480px" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
                <div className="absolute bottom-4 left-4 text-ivory">
                  <p className="font-serif text-2xl">Unsere Lieblingssträuße</p>
                  <p className="inline-flex items-center gap-1 text-[13px] font-semibold">Bestseller entdecken <ArrowRight className="size-3.5" /></p>
                </div>
              </Link>
            </div>
          )}
          {mega === "anlaesse" && (
            <div>
              <p className="eyebrow mb-5">Für wen? Zu welchem Anlass?</p>
              <ul className="grid grid-cols-5 gap-4 xl:grid-cols-9">
                {occasions.map((o) => (
                  <li key={o.slug}>
                    <Link href={routes.occasion(o.slug)} className="group block">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-ivory-200">
                        <Image src={o.image} alt="" fill sizes="160px" className="object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                      </div>
                      <p className="mt-2 text-[13px] font-semibold text-ink group-hover:text-forest">{o.name}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} side="left" width="max-w-[380px]" title={<Logo />} labelledBy="mobile-menu-title">
        <nav aria-label="Mobile Navigation" className="px-5 py-4">
          <ul className="divide-y divide-line">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="flex items-center justify-between py-4 font-serif text-2xl text-ink">
                  {item.label} <ArrowRight className="size-4 text-ink-soft" />
                </Link>
                {item.mega === "anlaesse" && (
                  <ul className="-mt-1 flex flex-wrap gap-2 pb-4">
                    {occasions.map((o) => (
                      <li key={o.slug}><Link href={routes.occasion(o.slug)} className="inline-flex rounded-full border border-line bg-white px-3 py-1.5 text-[13px] text-ink">{o.name}</Link></li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-3">
            <Button href={settings.headerCta.href} size="lg" full>{settings.headerCta.label}</Button>
            <div className="flex gap-4 text-sm text-ink-muted">
              <Link href={routes.account} className="inline-flex items-center gap-1.5"><User className="size-4" /> Konto</Link>
              <Link href={routes.tracking}>Bestellung verfolgen</Link>
              <Link href={routes.faq}>FAQ</Link>
            </div>
          </div>
        </nav>
      </Drawer>
      <span className="sr-only" aria-hidden><X className="size-0" /></span>
    </header>
  );
}
