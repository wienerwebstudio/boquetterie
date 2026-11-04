import Link from "next/link";
import type { Category } from "@/types";
import { routes } from "@/lib/urls";
import { cn } from "@/lib/format";

/** Horizontal, scrollable row of collection pills. Server component. */
export function CategoryStrip({ categories, active, className }: { categories: Category[]; active: string; className?: string }) {
  const items = categories.filter((c) => c.showInNav);
  return (
    <nav aria-label="Kollektionen" className={cn("-mx-5 sm:mx-0", className)}>
      <ul className="flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none sm:flex-wrap sm:px-0">
        {items.map((c) => {
          const isActive = c.slug === active;
          return (
            <li key={c.slug} className="shrink-0">
              <Link
                href={routes.category(c.slug)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-medium transition-colors",
                  isActive ? "border-forest bg-forest text-ivory" : "border-line bg-white text-ink hover:border-forest hover:text-forest",
                )}
              >
                {c.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
