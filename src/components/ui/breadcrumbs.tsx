"use client";
import Link from "@/components/ui/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";
import { useI18n } from "@/i18n/client";

export interface Crumb { label: string; href?: string }

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  const t = useI18n().m.ui.breadcrumbs;
  return (
    <nav aria-label={t.label} className={cn("text-[13px] text-ink-muted", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        <li><Link href="/" className="inline-flex min-h-7 items-center hover:text-forest">{t.home}</Link></li>
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5 text-stone" aria-hidden />
            {c.href ? <Link href={c.href} className="inline-flex min-h-7 items-center hover:text-forest">{c.label}</Link> : <span className="text-ink" aria-current="page">{c.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
