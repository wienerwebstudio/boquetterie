import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";

export interface Crumb { label: string; href?: string }

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Brotkrumen" className={cn("text-[13px] text-ink-muted", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        <li><Link href="/" className="hover:text-forest">Start</Link></li>
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5 text-stone" aria-hidden />
            {c.href ? <Link href={c.href} className="hover:text-forest">{c.label}</Link> : <span className="text-ink" aria-current="page">{c.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
