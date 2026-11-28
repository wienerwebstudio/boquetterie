"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, ShoppingBag, Flower2, Layers, Sparkles, Gift, Truck, Ticket, MessageCircleQuestionMark,
  Star, MessageSquareText, Repeat, Inbox, PanelsTopLeft, FileText, Globe, Images, Settings, Mail, BellRing, Menu, X, LogOut, ExternalLink, Wallet, Store, Send, FileSignature, HandCoins, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/format";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; group?: string }[] = [
  { href: "/admin", label: "Übersicht", icon: LayoutDashboard },
  { href: "/admin/bestellungen", label: "Bestellungen", icon: ShoppingBag },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/produkte", label: "Produkte", icon: Flower2, group: "Sortiment" },
  { href: "/admin/kategorien", label: "Kategorien", icon: Layers },
  { href: "/admin/anlaesse", label: "Anlässe", icon: Sparkles },
  { href: "/admin/extras", label: "Extras", icon: Gift },
  { href: "/admin/partner", label: "Partner", icon: Store },
  { href: "/admin/partner-abrechnung", label: "Partner-Abrechnung", icon: HandCoins },
  { href: "/admin/floristen-budget", label: "Floristen-Budget", icon: Wallet },
  { href: "/admin/liefergebiete", label: "Liefergebiete", icon: Truck, group: "Verkauf" },
  { href: "/admin/anfragen", label: "Anfragen", icon: Inbox },
  { href: "/admin/angebote", label: "Angebote", icon: FileSignature },
  { href: "/admin/gutscheine", label: "Gutscheine", icon: Ticket },
  { href: "/admin/outreach", label: "Outreach", icon: Send },
  { href: "/admin/faq", label: "FAQ", icon: MessageCircleQuestionMark, group: "Inhalte" },
  { href: "/admin/bewertungen", label: "Bewertungen", icon: Star },
  { href: "/admin/bewertungen/eingereicht", label: "Eingereichte Bewertungen", icon: MessageSquareText },
  { href: "/admin/blumen-abo", label: "Blumen-Abo", icon: Repeat },
  { href: "/admin/startseite", label: "Startseite", icon: PanelsTopLeft },
  { href: "/admin/seiten", label: "Seiten", icon: FileText },
  { href: "/admin/landingpages", label: "Landingpages", icon: Globe },
  { href: "/admin/medien", label: "Medien", icon: Images },
  { href: "/admin/einstellungen", label: "Einstellungen", icon: Settings, group: "System" },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/erinnerungen", label: "Erinnerungen", icon: BellRing },
];

/** Accent hue per nav group (see admin.css `[data-accent]`). The first, unnamed group is the start area. */
export type AdminAccent = "emerald" | "sky" | "violet" | "amber" | "coral" | "rose" | "teal";
const GROUP_ACCENTS: Record<string, AdminAccent> = {
  "": "emerald",
  Sortiment: "rose",
  Verkauf: "amber",
  Inhalte: "violet",
  Outreach: "coral",
  System: "sky",
};
const FALLBACK_ACCENT: AdminAccent = "teal";

/** NAV with each entry's (inherited) group and accent resolved. */
const NAV_RESOLVED = (() => {
  let group = "";
  return NAV.map((item) => {
    if (item.group) group = item.group;
    return { ...item, groupName: group, accent: GROUP_ACCENTS[group] ?? FALLBACK_ACCENT };
  });
})();

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/bewertungen") return pathname === href || (pathname.startsWith(href + "/") && !pathname.startsWith(href + "/eingereicht"));
  return pathname === href || pathname.startsWith(href + "/");
}

function BrandMark({ brandName }: { brandName: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#f8a9c1_-20%,#d6406d_45%,#e0532f_110%)] text-white shadow-[0_8px_20px_-8px_rgba(214,64,109,0.9)]">
        <Flower2 className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold tracking-tight text-white">{brandName}</p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a8c7b6]">Verwaltung</p>
      </div>
    </div>
  );
}

export function AdminShell({ children, brandName, greeting, today, badges }: { children: ReactNode; brandName: string; greeting?: string; today?: string; /** Counts shown next to nav entries, e.g. new requests. */ badges?: Record<string, number> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const current = NAV_RESOLVED.find((item) => isActive(pathname, item.href));

  const nav = (
    <nav aria-label="Admin-Navigation" className="flex flex-col gap-0.5 px-3 py-3">
      {NAV_RESOLVED.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <div key={item.href} data-accent={item.accent}>
            {item.group && (
              <p className="mb-1.5 mt-5 flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#b5ccbf]">
                <span className="bl-nav-dot size-1.5 rounded-full" aria-hidden />
                {item.group}
              </p>
            )}
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                "bl-nav-link group flex items-center gap-3 rounded-xl px-2 py-1.5 text-[14px] font-medium transition-colors",
                !active && "text-[#e6efe9] hover:bg-white/[0.07] hover:text-white",
              )}
            >
              <span className="bl-nav-icon flex size-7 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
              {badges?.[item.href] ? (
                <span className="ms-auto rounded-full bg-[#f59e0b] px-2 py-0.5 text-[11.5px] font-bold tabular-nums text-[#1f1300]" aria-label={`${badges[item.href]} neu`} data-testid={`nav-badge-${item.href.split("/").pop()}`}>{badges[item.href]}</span>
              ) : null}
            </Link>
          </div>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-auto border-t border-white/10 px-3 py-3">
      <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-[#d3e2d9] transition-colors hover:bg-white/[0.07] hover:text-white">
        <ExternalLink className="size-4" aria-hidden /> Shop öffnen
      </a>
      <form action="/api/admin/logout" method="post">
        <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] text-[#d3e2d9] transition-colors hover:bg-white/[0.07] hover:text-white">
          <LogOut className="size-4" aria-hidden /> Abmelden
        </button>
      </form>
    </div>
  );

  const CurrentIcon = current?.icon;

  return (
    <div className="flex min-h-screen font-sans text-ink">
      {/* Desktop sidebar */}
      <aside className="bl-sidebar hidden w-64 shrink-0 text-ivory lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="px-5 pb-2 pt-5">
            <BrandMark brandName={brandName} />
          </div>
          <div className="bl-scroll flex-1 overflow-y-auto">{nav}</div>
          {footer}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="bl-sidebar sticky top-0 z-30 flex h-14 items-center justify-between px-3 text-white shadow-[0_6px_20px_-12px_rgba(0,0,0,0.6)] lg:hidden">
          <button type="button" onClick={() => setOpen(true)} aria-label="Menü öffnen" aria-expanded={open} className="rounded-lg p-2 text-white hover:bg-white/10">
            <Menu className="size-5" />
          </button>
          <p className="flex items-center gap-2 text-[14px] font-semibold">
            <Flower2 className="size-4 text-[#f8a9c1]" aria-hidden /> {brandName} · Verwaltung
          </p>
          <a href="/" target="_blank" rel="noreferrer" aria-label="Shop ansehen" className="rounded-lg p-2 text-white hover:bg-white/10">
            <ExternalLink className="size-5" aria-hidden />
          </a>
        </header>

        {/* Desktop top bar */}
        <div className="sticky top-0 z-20 hidden h-16 items-center justify-between gap-4 border-b border-[#e7e2d9] bg-[#f6f4ef]/85 backdrop-blur-md lg:flex lg:px-8 2xl:px-10">
          <div className="flex min-w-0 items-center gap-3" data-accent={current?.accent ?? "emerald"}>
            {CurrentIcon && (
              <span className="bl-tile flex size-8 shrink-0 items-center justify-center rounded-lg">
                <CurrentIcon className="size-4" aria-hidden />
              </span>
            )}
            <p className="flex min-w-0 items-center gap-2 text-[13.5px]">
              <span className="text-[#5f5c56]">{current?.groupName || "Start"}</span>
              <span className="text-[#8d8376]" aria-hidden>/</span>
              <span className="truncate font-semibold text-ink">{current?.label ?? "Verwaltung"}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            {greeting && (
              <p className="text-right text-[13px] leading-tight">
                <span className="block font-semibold text-ink">{greeting}!</span>
                {today && <span className="block text-[12px] text-[#5f5c56]">{today}</span>}
              </p>
            )}
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[#e7e2d9] bg-white px-4 text-[13px] font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-[#0f9466] hover:text-[#0a6644]"
            >
              <ExternalLink className="size-4" aria-hidden /> Shop ansehen
            </a>
          </div>
        </div>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin-Navigation">
            <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden />
            <div className="bl-sidebar absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col text-ivory shadow-drawer animate-slide-in-left">
              <div className="flex items-center justify-between gap-2 px-5 py-4">
                <BrandMark brandName={brandName} />
                <button type="button" onClick={() => setOpen(false)} aria-label="Menü schließen" className="rounded-lg p-2 text-white/85 hover:bg-white/10">
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{nav}</div>
              {footer}
            </div>
          </div>
        )}

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 2xl:px-10">
          <div className="bl-enter mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
