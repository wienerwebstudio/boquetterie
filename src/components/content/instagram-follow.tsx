import { buttonClasses } from "@/components/ui/button";
import { SocialMark } from "@/components/icons/social";
import { instagramHandle } from "@/lib/social";
import { getI18n } from "@/i18n/server";
import { cn } from "@/lib/format";

/**
 * "Folge uns auf Instagram" – text, handle and a button to the profile. No feed embed and
 * no images (nothing that could pretend to be a post). Renders nothing without a link.
 */
export async function InstagramFollow({ href, variant = "section", className }: { href: string | null; variant?: "section" | "inline"; className?: string }) {
  if (!href) return null;
  const { m, fmt } = await getI18n();
  const t = m.layout.social;
  const handle = instagramHandle(href);
  const button = (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="instagram-follow"
      className={buttonClasses({ variant: variant === "section" ? "primary" : "outline", size: "lg" })}
    >
      <SocialMark network="instagram" className="size-4" />
      {t.instagramCta}
      <span className="sr-only"> {t.newTab}</span>
    </a>
  );

  if (variant === "inline") {
    return (
      <div className={cn("flex flex-col items-start gap-4 sm:flex-row sm:items-center", className)}>
        {button}
        {handle && <span className="text-[14px] text-ink-muted">{handle}</span>}
      </div>
    );
  }

  return (
    <section aria-labelledby="instagram-follow-title" className={cn("border-t border-line", className)}>
      <div className="container-x flex flex-col items-start gap-6 py-14 sm:flex-row sm:items-center sm:justify-between lg:py-20">
        <div className="flex items-start gap-5">
          <span className="hidden size-14 shrink-0 items-center justify-center rounded-full bg-ivory-200 text-forest sm:inline-flex" aria-hidden>
            <SocialMark network="instagram" className="size-6" />
          </span>
          <div>
            <p className="eyebrow mb-3">{handle ?? "Instagram"}</p>
            <h2 id="instagram-follow-title" className="display-3 text-balance text-ink">{t.followInstagram}</h2>
            {handle && <p className="mt-3 max-w-md text-pretty text-[15px] leading-relaxed text-ink-muted">{fmt(t.instagramText, { handle })}</p>}
          </div>
        </div>
        {button}
      </div>
    </section>
  );
}
