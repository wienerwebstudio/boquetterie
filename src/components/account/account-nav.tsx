import { Bell, Heart, LogOut, MapPin, Package, UserRound } from "lucide-react";

const ITEMS = [
  { href: "#bestellungen", label: "Bestellungen", icon: Package },
  { href: "#empfaenger", label: "Empfänger:innen", icon: MapPin },
  { href: "#favoriten", label: "Favoriten", icon: Heart },
  { href: "#profil", label: "Profil", icon: UserRound },
  { href: "/erinnerung", label: "Erinnerungen", icon: Bell },
] as const;

/** Sticky in-page navigation for the logged-in account plus the logout form. */
export function AccountNav({ showFavorites }: { showFavorites: boolean }) {
  const items = ITEMS.filter((i) => showFavorites || i.href !== "#favoriten");
  return (
    <nav aria-label="Konto-Bereiche" className="sticky top-[var(--header-offset,72px)] z-10 -mx-4 border-y border-line bg-ivory/90 px-4 backdrop-blur sm:mx-0 sm:rounded-md sm:border sm:px-2">
      <ul className="flex gap-1 overflow-x-auto py-2 text-[13.5px] font-semibold text-ink-muted">
        {items.map(({ href, label, icon: Icon }) => (
          <li key={href} className="shrink-0">
            <a href={href} className="flex items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-ivory-200 hover:text-forest">
              <Icon className="size-4" strokeWidth={1.5} aria-hidden />{label}
            </a>
          </li>
        ))}
        <li className="ml-auto shrink-0">
          <form method="post" action="/api/auth/logout">
            <button type="submit" className="flex items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-ivory-200 hover:text-burgundy">
              <LogOut className="size-4" strokeWidth={1.5} aria-hidden />Abmelden
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
