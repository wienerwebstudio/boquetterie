"use client";
import { useId, useState } from "react";
import { cn } from "@/lib/format";
import { Plus } from "lucide-react";

export interface AccordionItem { id: string; title: string; content: React.ReactNode }

export function Accordion({ items, className, defaultOpen }: { items: AccordionItem[]; className?: string; defaultOpen?: string }) {
  const [open, setOpen] = useState<string | null>(defaultOpen ?? null);
  const base = useId();
  return (
    <div className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((item) => {
        const isOpen = open === item.id;
        const btnId = `${base}-${item.id}-btn`;
        const panelId = `${base}-${item.id}-panel`;
        return (
          <div key={item.id}>
            <h3>
              <button
                id={btnId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : item.id)}
                className="flex w-full items-center justify-between gap-6 py-5 text-left font-sans text-[15px] font-semibold text-ink transition-colors hover:text-forest sm:text-base"
              >
                {item.title}
                <Plus className={cn("size-4 shrink-0 text-forest transition-transform duration-300", isOpen && "rotate-45")} aria-hidden />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-soft)]", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}
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
