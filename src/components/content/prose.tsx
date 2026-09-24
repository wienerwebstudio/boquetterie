import { cn } from "@/lib/format";

/**
 * Typographic wrapper for editorial body copy.
 * Narrow measure, 15–16px, relaxed leading, muted body colour; headings in ink.
 */
export function Prose({ children, className, as: Tag = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "article" | "section" }) {
  return (
    <Tag
      className={cn(
        "max-w-2xl text-[15px] leading-relaxed text-ink-muted sm:text-base",
        "[&_p+p]:mt-4 [&_p]:text-pretty",
        "[&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:leading-snug [&_h2]:text-ink [&_h2+p]:mt-3 sm:[&_h2]:text-3xl",
        "[&_h3]:mt-8 [&_h3]:font-sans [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink [&_h3+p]:mt-2",
        "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5",
        "[&_a]:text-forest [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-forest-700",
        "[&_strong]:font-semibold [&_strong]:text-ink",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Renders a list of plain-text paragraphs inside a Prose block. */
export function Paragraphs({ items, className }: { items: string[]; className?: string }) {
  return (
    <Prose className={className}>
      {items.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
    </Prose>
  );
}
