import type { HomepageContent } from "@/types";
import { NewsletterForm } from "./newsletter-form";
import { getI18n } from "@/i18n/server";

export async function Newsletter({ content }: { content: HomepageContent["newsletter"] }) {
  const { m } = await getI18n();
  return (
    <section id="newsletter" aria-labelledby="newsletter-title" className="bg-blush py-16 sm:py-20 lg:py-24">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-14">
          <div className="lg:col-span-6">
            <p className="eyebrow mb-3">{m.home.newsletter.eyebrow}</p>
            <h2 id="newsletter-title" className="display-2 max-w-lg text-balance text-ink">{content.headline}</h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-muted sm:text-base">{content.text}</p>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <NewsletterForm placeholder={content.placeholder} button={content.button} note={content.note} />
          </div>
        </div>
      </div>
    </section>
  );
}
