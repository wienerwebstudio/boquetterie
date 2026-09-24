import Image from "next/image";
import type { HomepageContent } from "@/types";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export function Editorial({ content }: { content: HomepageContent["editorial"] }) {
  return (
    <Section id="handwerk">
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="order-2 lg:order-1 lg:col-span-5 lg:col-start-1 lg:pr-6">
          <p className="eyebrow mb-3">{content.eyebrow}</p>
          <h2 className="display-2 text-balance text-ink">{content.headline}</h2>
          <p className="mt-5 max-w-md text-pretty text-[15.5px] leading-relaxed text-ink-muted sm:text-base">{content.text}</p>
          <div className="mt-8">
            <Button href={content.cta.href} variant="outline" size="lg">{content.cta.label}</Button>
          </div>
        </div>
        <Reveal className="order-1 lg:order-2 lg:col-span-7">
          <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-ivory-200 sm:aspect-[3/2] lg:aspect-[4/3]">
            <Image src={content.image} alt={content.imageAlt} fill sizes="(min-width: 1440px) 780px, (min-width: 1024px) 58vw, 100vw" className="object-cover" />
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
