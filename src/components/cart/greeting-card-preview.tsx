import { cn } from "@/lib/format";

/**
 * Live preview of the greeting card. Used in the product configurator and the cart.
 * Deliberately calm: ivory card, serif italic text, a discreet brand mark.
 */
export function GreetingCardPreview({
  message, senderName, anonymous, placeholder = "Deine Nachricht erscheint hier.", compact, className,
}: {
  message?: string; senderName?: string; anonymous?: boolean; placeholder?: string; compact?: boolean; className?: string;
}) {
  const text = message?.trim();
  const showSender = !anonymous && Boolean(senderName?.trim());
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-line bg-[#fdfbf6] shadow-soft",
        compact ? "px-5 py-5" : "px-6 py-7 sm:px-8 sm:py-9",
        className,
      )}
      aria-label="Vorschau der Grußkarte"
    >
      <div className="pointer-events-none absolute inset-2 rounded-[6px] border border-sand/70" aria-hidden />
      <p
        className={cn(
          "relative whitespace-pre-line break-words font-serif italic leading-[1.55] text-ink",
          compact ? "text-[17px]" : "text-[19px] sm:text-[21px]",
          !text && "text-ink-soft",
        )}
      >
        {text || placeholder}
      </p>
      {showSender && (
        <p className={cn("relative mt-4 font-serif text-ink", compact ? "text-[15px]" : "text-[17px]")}>— {senderName?.trim()}</p>
      )}
      {text && anonymous && (
        <p className="relative mt-4 text-[11px] uppercase tracking-[0.16em] text-ink-soft">Ohne Absender</p>
      )}
      <p className={cn("relative text-center font-serif uppercase tracking-[0.32em] text-stone", compact ? "mt-5 text-[11px]" : "mt-8 text-[12px]")}>
        Boquetterie
      </p>
    </div>
  );
}
