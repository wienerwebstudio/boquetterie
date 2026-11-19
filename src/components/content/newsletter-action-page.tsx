import Link from "@/components/ui/link";
import { Check } from "lucide-react";
import { routes } from "@/lib/urls";
import { PageHeader } from "@/components/content/page-header";

/**
 * Shared layout of the newsletter confirm / unsubscribe pages: either the button
 * (a POST, so mail scanners that open links change nothing) or the outcome.
 */
export function NewsletterActionPage({ title, intro, action, button, hidden, outcome }: {
  title: string;
  intro: string;
  action: string;
  button: string;
  hidden?: { id: string; token: string };
  outcome?: { ok: boolean; title: string; text: string };
}) {
  return (
    <article>
      <PageHeader eyebrow="Newsletter" title={outcome?.title ?? title} intro={outcome ? undefined : intro} crumbs={[{ label: "Newsletter" }]} />
      <div className="container-x py-14 sm:py-20">
        {outcome ? (
          <div role="status" className="max-w-xl rounded-md border border-line bg-white/70 p-8">
            {outcome.ok && <span className="inline-flex size-10 items-center justify-center rounded-full bg-success text-ivory"><Check className="size-5" strokeWidth={2.5} aria-hidden /></span>}
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">{outcome.text}</p>
            <Link href={routes.shop} className="mt-6 inline-block font-semibold text-forest">Zu den Blumen</Link>
          </div>
        ) : hidden ? (
          <form method="post" action={action} className="max-w-xl">
            <input type="hidden" name="id" value={hidden.id} />
            <input type="hidden" name="token" value={hidden.token} />
            <button type="submit" className="inline-flex h-12 items-center rounded-md bg-forest px-6 text-[15px] font-semibold text-ivory transition-colors hover:bg-forest-700">
              {button}
            </button>
          </form>
        ) : (
          <p className="max-w-xl text-[15px] leading-relaxed text-ink-muted">Dieser Link ist unvollständig. Bitte öffne ihn direkt aus der E-Mail.</p>
        )}
      </div>
    </article>
  );
}
