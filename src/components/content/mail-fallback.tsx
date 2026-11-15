import { Mail } from "lucide-react";

/**
 * Shown when a form could not be delivered (API answered 503 `unavailable`):
 * offers the same message as a pre-filled e-mail, so nothing typed is lost.
 */
export function MailFallback({ email, subject, body, className }: { email: string; subject: string; body: string; className?: string }) {
  const href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return (
    <div role="alert" className={className}>
      <div className="rounded-md border border-line-strong bg-ivory-100 px-4 py-4 sm:px-5">
        <p className="text-[14.5px] font-semibold text-ink">Das Formular ist gerade nicht erreichbar.</p>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">
          Deine Nachricht ist nicht verloren: Schick sie uns bitte direkt per E-Mail an{" "}
          <span className="font-semibold text-ink">{email}</span>. Der Text ist schon eingefügt.
        </p>
        <a
          href={href}
          className="mt-3 inline-flex h-11 items-center gap-2 rounded-md bg-forest px-5 text-[14px] font-semibold text-ivory transition-colors hover:bg-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        >
          <Mail className="size-4" aria-hidden /> E-Mail öffnen
        </a>
      </div>
    </div>
  );
}
