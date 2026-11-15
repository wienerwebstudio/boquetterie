"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/lib/urls";

const LEGAL = [
  { label: "Kontakt", href: routes.contact },
  { label: "Impressum", href: routes.legal.imprint },
  { label: "Datenschutz", href: routes.legal.privacy },
  { label: "AGB", href: routes.legal.terms },
  { label: "Widerruf", href: routes.legal.withdrawal },
];

/**
 * Renders the full footer everywhere except in the checkout: there only the
 * legally relevant links remain, so nothing pulls the customer out of the order.
 */
export function FooterSlot({ brandName, children }: { brandName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  if (!pathname.startsWith(routes.checkout)) return <>{children}</>;
  return (
    <footer className="border-t border-line bg-ivory-100">
      <div className="container-x flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Rechtliches">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-6 items-center text-[13px] text-ink-muted underline-offset-4 hover:text-forest hover:underline">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-[12px] text-ink-soft">© {new Date().getFullYear()} {brandName}</p>
      </div>
    </footer>
  );
}
