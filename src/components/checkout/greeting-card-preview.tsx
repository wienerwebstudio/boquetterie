import { cn } from "@/lib/format";

/** Live preview of the greeting card – ivory stock, serif italic, hand-written feel. */
export function GreetingCardPreview({ message, senderName, anonymous, className, compact }: {
  message: string; senderName?: string; anonymous?: boolean; className?: string; compact?: boolean;
}) {
  const text = message.trim();
  const signature = anonymous ? null : senderName?.trim() || null;
  return (
    <div className={cn("relative", className)} aria-label="Vorschau der Grußkarte">
      <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-md bg-sand/60" aria-hidden />
      <div
        className={cn(
          "relative flex flex-col rounded-md border border-line bg-[#fdfbf7] shadow-soft",
          compact ? "min-h-32 px-5 py-4" : "min-h-52 px-7 py-6 sm:px-9 sm:py-8",
        )}
      >
        <div className="mb-3 flex items-center gap-2" aria-hidden>
          <svg viewBox="0 0 24 24" className="size-4 text-forest" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21c0-5 0-9 0-10" />
            <path d="M12 11c-2.5 0-5-2-5-5 3 0 5 2 5 5z" />
            <path d="M12 11c2.5 0 5-2 5-5-3 0-5 2-5 5z" />
          </svg>
          <span className="h-px flex-1 bg-line" />
        </div>
        <p
          className={cn(
            "flex-1 whitespace-pre-wrap font-serif italic leading-relaxed text-ink [overflow-wrap:anywhere]",
            compact ? "text-[17px]" : "text-[20px] sm:text-[22px]",
            !text && "text-ink-soft",
          )}
        >
          {text || "Deine Worte erscheinen hier."}
        </p>
        <p className={cn("mt-4 text-right font-serif text-ink-muted", compact ? "text-[15px]" : "text-[17px]")}>
          {signature ? `— ${signature}` : anonymous ? <span className="text-[12px] font-sans not-italic tracking-[0.08em] uppercase text-ink-soft">Ohne Absender</span> : null}
        </p>
      </div>
    </div>
  );
}
