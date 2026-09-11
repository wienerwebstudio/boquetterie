import { cn } from "@/lib/format";

/** Wordmark – set in the serif brand face with a small floral mark. */
export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", light ? "text-ivory" : "text-forest", className)}>
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21c0-5 0-9 0-10" />
        <path d="M12 11c-2.5 0-5-2-5-5 3 0 5 2 5 5z" />
        <path d="M12 11c2.5 0 5-2 5-5-3 0-5 2-5 5z" />
        <path d="M12 8c-1.2-1.4-1.2-3.6 0-5 1.2 1.4 1.2 3.6 0 5z" />
        <path d="M8 21c1.2-2.4 2.6-3.6 4-4 1.4.4 2.8 1.6 4 4" />
      </svg>
      <span className="font-serif text-[26px] font-medium leading-none tracking-[-0.01em]">Boquetterie</span>
    </span>
  );
}
