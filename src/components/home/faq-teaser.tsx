import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { FAQ, HomepageContent } from "@/types";
import { Section } from "@/components/ui/section";
import { Accordion } from "@/components/ui/accordion";
import { routes } from "@/lib/urls";

export function FaqTeaser({ content, faqs }: { content: HomepageContent["faq"]; faqs: FAQ[] }) {
  if (!faqs.length) return null;
  return (
    <Section id="faq">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-4">
          <p className="eyebrow mb-3">FAQ</p>
          <h2 className="display-2 text-balance text-ink">{content.headline}</h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-muted">Antworten auf die häufigsten Fragen zu Lieferung, Bestellung und Blumen.</p>
          <Link href={routes.faq} className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-forest">
            Alle Fragen & Antworten
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
        <div className="lg:col-span-8">
          <Accordion items={faqs.map((f) => ({ id: f.id, title: f.question, content: f.answer }))} defaultOpen={faqs[0]?.id} />
        </div>
      </div>
    </Section>
  );
}
