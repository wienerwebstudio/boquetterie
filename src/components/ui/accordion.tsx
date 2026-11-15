"use client";
import { useId, useState } from "react";
import { cn } from "@/lib/format";
import { Plus } from "lucide-react";

export interface AccordionItem { id: string; title: string; content: React.ReactNode }

/**
 * Single-open accordion (WAI-ARIA "Accordion" pattern).
 *
 * Collapsed panels stay in the HTML (SEO, no layout jump) but are removed from the
 * tab order and the accessibility tree with `visibility: hidden`. Visibility is part
 * of the transition, so it only flips once the closing animation has finished and is
 * back immediately when a panel opens.
 */
export function Accordion({ items, className, defaultOpen, headingLevel = 3 }: {
  items: AccordionItem[]; className?: string; defaultOpen?: string;
  /** Level of the heading wrapping each trigger – match it to the surrounding outline. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}) {
  const [open, setOpen] = useState<string | null>(defaultOpen ?? null);
  const base = useId();
  const Heading = `h${headingLevel}` as const;
  // Every region is a landmark. With many panels that is more noise than help (APG: at most ~6).
  const asRegion = items.length <= 6;
  return (
    <div className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((item) => {
        const isOpen = open === item.id;
        const btnId = `${base}-${item.id}-btn`;
        const panelId = `${base}-${item.id}-panel`;
        return (
          <div key={item.id}>
            <Heading>
              <button
                type="button"
                id={btnId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : item.id)}
                className="flex w-full items-center justify-between gap-6 py-5 text-left font-sans text-[15px] font-semibold text-ink transition-colors hover:text-forest sm:text-base"
              >
                {item.title}
                <Plus className={cn("size-4 shrink-0 text-forest transition-transform duration-300", isOpen && "rotate-45")} aria-hidden />
              </button>
            </Heading>
            <div
              id={panelId}
              role={asRegion ? "region" : undefined}
              aria-labelledby={asRegion ? btnId : undefined}
              className={cn(
                "grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-[var(--ease-soft)]",
                isOpen ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div className="pb-6 pr-10 text-[15px] leading-relaxed text-ink-muted">{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
