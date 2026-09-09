"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, ShoppingBag, Flower2, Layers, Sparkles, Gift, Truck, Ticket, MessageCircleQuestionMark,
  Star, Repeat, PanelsTopLeft, FileText, Globe, Settings, Mail, Menu, X, LogOut, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/format";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; group?: string }[] = [
  { href: "/admin", label: "Übersicht", icon: LayoutDashboard },
  { href: "/admin/bestellungen", label: "Bestellungen", icon: ShoppingBag },
  { href: "/admin/produkte", label: "Produkte", icon: Flower2, group: "Sortiment" },
  { href: "/admin/kategorien", label: "Kategorien", icon: Layers },
  { href: "/admin/anlaesse", label: "Anlässe", icon: Sparkles },
  { href: "/admin/extras", label: "Extras", icon: Gift },
  { href: "/admin/liefergebiete", label: "Liefergebiete", icon: Truck, group: "Verkauf" },
  { href: "/admin/gutscheine", label: "Gutscheine", icon: Ticket },
  { href: "/admin/faq", label: "FAQ", icon: MessageCircleQuestionMark, group: "Inhalte" },
  { href: "/admin/bewertungen", label: "Bewertungen", icon: Star },
  { href: "/admin/blumen-abo", label: "Blumen-Abo", icon: Repeat },
  { href: "/admin/startseite", label: "Startseite", icon: PanelsTopLeft },
  { href: "/admin/seiten", label: "Seiten", icon: FileText },
  { href: "/admin/landingpages", label: "Landingpages", icon: Globe },
  { href: "/admin/einstellungen", label: "Einstellungen", icon: Settings, group: "System" },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminShell({ children, brandName }: { children: ReactNode; brandName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const nav = (
    <nav aria-label="Admin-Navigation" className="flex flex-col gap-0.5 px-3 py-3">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <div key={item.href}>
            {item.group && <p className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ivory/50 first:mt-0">{item.group}</p>}
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-[14px] font-medium transition-colors",
                active ? "bg-ivory text-forest" : "text-ivory/85 hover:bg-forest-600 hover:text-ivory",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-auto border-t border-ivory/10 px-3 py-3">
      <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-ivory/75 hover:bg-forest-600 hover:text-ivory">
        <ExternalLink className="size-4" aria-hidden /> Shop öffnen
      </a>
      <form action="/api/admin/logout" method="post">
        <button type="submit" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] text-ivory/75 hover:bg-forest-600 hover:text-ivory">
          <LogOut className="size-4" aria-hidden /> Abmelden
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-ivory font-sans text-ink">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-forest text-ivory lg:flex">
        <div className="px-6 py-5">
          <p className="text-[15px] font-semibold tracking-tight">{brandName}</p>
          <p className="text-[11px] uppercase tracking-[0.16em] text-ivory/50">Verwaltung</p>
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        {footer}
      </aside>

      {/* Mobile top bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-ivory/95 px-4 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setOpen(true)} aria-label="Menü öffnen" aria-expanded={open} className="-ml-2 rounded-md p-2 text-ink hover:bg-ivory-200">
            <Menu className="size-5" />
          </button>
          <p className="text-[14px] font-semibold">{brandName} · Verwaltung</p>
          <span className="w-9" />
        </header>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin-Navigation">
            <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-hidden />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-forest text-ivory shadow-drawer animate-fade-in">
              <div className="flex items-center justify-between px-5 py-4">
                <p className="text-[15px] font-semibold">{brandName}</p>
                <button type="button" onClick={() => setOpen(false)} aria-label="Menü schließen" className="rounded-md p-2 text-ivory/80 hover:bg-forest-600">
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{nav}</div>
              {footer}
            </div>
          </div>
        )}

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
