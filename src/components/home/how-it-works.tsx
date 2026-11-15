import type { HomepageContent } from "@/types";
import { Section } from "@/components/ui/section";
import { TrustIcon } from "@/components/icons/trust-icon";

export function HowItWorks({ content }: { content: HomepageContent["howItWorks"] }) {
  return (
    <Section id="so-funktioniert-es">
      <div className="grid gap-7 sm:gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <p className="eyebrow mb-3">So funktioniert es</p>
          <h2 className="display-2 max-w-md text-balance text-ink">{content.headline}</h2>
        </div>
        {/* Phones: compact numbered rows. From `sm`: cards with icon. */}
        <ol className="grid sm:grid-cols-2 sm:gap-8 lg:col-span-8 lg:grid-cols-4 lg:gap-6">
          {content.steps.map((s, i) => (
            <li key={s.title} className="relative flex gap-4 border-t border-line py-4 sm:block sm:py-0 sm:pt-6 lg:pt-7">
              <div className="flex shrink-0 items-start justify-between pt-1 sm:items-center sm:pt-0">
                <span className="font-serif text-[15px] italic tracking-[0.04em] text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
                <span className="hidden size-10 items-center justify-center rounded-full bg-ivory-100 text-forest sm:inline-flex">
                  <TrustIcon name={s.icon} className="size-[18px]" />
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="font-serif text-[21px] leading-tight text-ink sm:mt-5 sm:text-[24px]">{s.title}</h3>
                <p className="mt-1 text-[14.5px] leading-relaxed text-ink-muted sm:mt-2">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
