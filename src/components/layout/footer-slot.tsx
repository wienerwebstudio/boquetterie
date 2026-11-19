"use client";
import { resolvePublicPath, stripLocale } from "@/i18n/paths";
import Link from "@/components/ui/link";
import { usePathname } from "next/navigation";
import { routes } from "@/lib/urls";
import { useI18n } from "@/i18n/client";

const LEGAL = [
  { key: "contact", href: routes.contact },
  { key: "imprint", href: routes.legal.imprint },
  { key: "privacy", href: routes.legal.privacy },
  { key: "terms", href: routes.legal.terms },
  { key: "withdrawal", href: routes.legal.withdrawal },
] as const;

/**
 * Renders the full footer everywhere except in the checkout: there only the
 * legally relevant links remain, so nothing pulls the customer out of the order.
 */
export function FooterSlot({ brandName, children }: { brandName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const { m } = useI18n();
  // Compare the German path, so /en/checkout counts as checkout too.
  const germanPath = stripLocale(resolvePublicPath(pathname)?.internal ?? pathname);
  if (!germanPath.startsWith(routes.checkout)) return <>{children}</>;
  return (
    <footer className="border-t border-line bg-ivory-100">
      <div className="container-x flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label={m.layout.footer.legalNavigation}>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-6 items-center text-[13px] text-ink-muted underline-offset-4 hover:text-forest hover:underline">{m.layout.footer.links[l.key]}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-[12px] text-ink-soft">© {new Date().getFullYear()} {brandName}</p>
      </div>
    </footer>
  );
}
