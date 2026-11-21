import Image from "next/image";
import type { HomepageContent, SubscriptionConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/i18n/server";

export async function SubscriptionTeaser({ content, config }: { content: HomepageContent["subscription"]; config: SubscriptionConfig }) {
  const { m, price } = await getI18n();
  const t = m.home.subscriptionTeaser;
  const from = config.plans.length ? Math.min(...config.plans.map((p) => p.price)) : null;
  return (
    <section id="abo" aria-labelledby="abo-title" className="bg-forest text-ivory">
      <div className="container-x">
        <div className="grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-12 lg:gap-14 lg:py-28">
          <div className="lg:col-span-6 lg:pr-8">
            <p className="eyebrow mb-3 text-sand">{t.eyebrow}</p>
            <h2 id="abo-title" className="display-2 text-balance text-ivory">{content.headline}</h2>
            <p className="mt-5 max-w-lg text-pretty text-[15.5px] leading-relaxed text-sand sm:text-base">{content.text}</p>
            <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-ivory/15 pt-6 text-sand sm:max-w-md">
              {from !== null && (
                <div>
                  <dt className="text-[12px] uppercase tracking-[0.14em] text-sand/70">{t.from}</dt>
                  <dd className="mt-1 font-serif text-[28px] leading-none text-ivory">{price(from)}<span className="ml-1 font-sans text-[12px] text-sand/80">{t.perDelivery}</span></dd>
                </div>
              )}
              {config.frequencies.length > 0 && (
                <div>
                  <dt className="text-[12px] uppercase tracking-[0.14em] text-sand/70">{t.rhythm}</dt>
                  <dd className="mt-1 text-[14px] leading-snug text-ivory">{config.frequencies.map((f) => f.label).join(" · ")}</dd>
                </div>
              )}
            </dl>
            <div className="mt-8">
              <Button href={content.cta.href} variant="light" size="lg">{content.cta.label}</Button>
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-forest-700 sm:aspect-[3/2] lg:aspect-[5/4]">
              <Image src={config.image} alt={t.imageAlt} fill sizes="(min-width: 1440px) 640px, (min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
