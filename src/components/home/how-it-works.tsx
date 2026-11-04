import type { HomepageContent } from "@/types";
import { Section } from "@/components/ui/section";
import { TrustIcon } from "@/components/icons/trust-icon";

export function HowItWorks({ content }: { content: HomepageContent["howItWorks"] }) {
  return (
    <Section id="so-funktioniert-es">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <p className="eyebrow mb-3">So funktioniert es</p>
          <h2 className="display-2 max-w-md text-balance text-ink">{content.headline}</h2>
        </div>
        <ol className="grid gap-8 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4 lg:gap-6">
          {content.steps.map((s, i) => (
            <li key={s.title} className="relative border-t border-line pt-6 lg:pt-7">
              <div className="flex items-center justify-between">
                <span className="font-serif text-[15px] italic tracking-[0.04em] text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-ivory-100 text-forest">
                  <TrustIcon name={s.icon} className="size-[18px]" />
                </span>
              </div>
              <h3 className="mt-5 font-serif text-[24px] leading-tight text-ink">{s.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
