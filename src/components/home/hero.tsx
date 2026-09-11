import { getImageProps } from "next/image";
import type { HomepageContent } from "@/types";
import { Button } from "@/components/ui/button";
import { PostalCodeCheck } from "@/components/shop/postal-code-check";
import { HeroPreload } from "./hero-preload";

const DESKTOP = "(min-width: 1024px)";
const MOBILE = "(max-width: 1023px)";
const PORTRAIT_SIZES = "(min-width: 1440px) 640px, 50vw";

/**
 * Hero – split layout on desktop (copy + delivery check left, portrait image right),
 * full-bleed wide image on mobile. Uses art direction via <picture> and preloads
 * the matching source so the LCP image is requested from the <head>.
 */
export function Hero({ hero }: { hero: HomepageContent["hero"] }) {
  const common = { alt: hero.imageAlt };
  const {
    props: { srcSet: portraitSet },
  } = getImageProps({ ...common, src: hero.imagePortrait, width: 1200, height: 1500, sizes: PORTRAIT_SIZES });
  const {
    props: { srcSet: wideSet, ...img },
  } = getImageProps({ ...common, src: hero.imageWide, width: 1600, height: 1200, sizes: "100vw" });

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <HeroPreload
        items={[
          ...(portraitSet ? [{ href: hero.imagePortrait, srcSet: portraitSet, sizes: PORTRAIT_SIZES, media: DESKTOP }] : []),
          ...(wideSet ? [{ href: hero.imageWide, srcSet: wideSet, sizes: "100vw", media: MOBILE }] : []),
        ]}
      />
      <div className="container-x">
        <div className="grid items-center gap-8 pb-12 lg:grid-cols-12 lg:gap-12 lg:py-14 xl:gap-16 xl:py-20">
          {/* Image */}
          <div className="order-1 -mx-5 sm:-mx-8 lg:order-2 lg:col-span-6 lg:mx-0 xl:col-span-6">
            <div className="relative aspect-[4/3] overflow-hidden bg-ivory-200 sm:aspect-[16/10] lg:aspect-[4/5] lg:rounded-md">
              <picture>
                <source media={DESKTOP} srcSet={portraitSet} sizes={PORTRAIT_SIZES} />
                {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is spread from getImageProps */}
                <img
                  {...img}
                  srcSet={wideSet}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </picture>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/10 via-transparent to-transparent lg:hidden" aria-hidden />
            </div>
          </div>

          {/* Copy */}
          <div className="order-2 lg:order-1 lg:col-span-6 lg:pr-6 xl:col-span-6 xl:pr-10">
            <p className="eyebrow animate-fade-up">{hero.eyebrow}</p>
            <h1 id="hero-title" className="display-1 mt-4 max-w-[12ch] text-balance text-ink animate-fade-up [animation-delay:80ms]">
              {hero.headline}
            </h1>
            <p className="mt-5 max-w-lg text-pretty text-[15.5px] leading-relaxed text-ink-muted sm:text-[17px] animate-fade-up [animation-delay:160ms]">
              {hero.subheadline}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center animate-fade-up [animation-delay:240ms]">
              <Button href={hero.primaryCta.href} size="lg">{hero.primaryCta.label}</Button>
              <Button href={hero.secondaryCta.href} size="lg" variant="outline">{hero.secondaryCta.label}</Button>
            </div>
            <div className="mt-8 max-w-xl animate-fade-up [animation-delay:320ms] lg:mt-10">
              <PostalCodeCheck
                variant="hero"
                title={hero.deliveryCheck.title}
                placeholder={hero.deliveryCheck.placeholder}
                button={hero.deliveryCheck.button}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
