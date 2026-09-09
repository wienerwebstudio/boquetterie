import Image from "next/image";
import type { Metadata } from "next";
import type { CmsPage as CmsPageType, RichSection } from "@/types";
import { cn, slugify } from "@/lib/format";
import { PageHeader } from "./page-header";
import { Paragraphs } from "./prose";
import type { Crumb } from "@/components/ui/breadcrumbs";

/* ---------------- Metadata helper ---------------- */

export function cmsMetadata(page: CmsPageType | null, fallbackTitle: string, canonical: string): Metadata {
  return {
    title: page?.seo.title ?? fallbackTitle,
    description: page?.seo.description,
    alternates: { canonical },
  };
}

/* ---------------- Placeholder box ---------------- */

/** Clearly marked box for content that still has to be supplied by the operator. */
export function PlaceholderBox({ paragraphs, label = "Platzhalter – Inhalt folgt", className }: { paragraphs?: string[]; label?: string; className?: string }) {
  return (
    <div className={cn("max-w-2xl rounded-md border border-dashed border-stone bg-ivory-100/70 p-5 sm:p-6", className)} role="note">
      <p className="eyebrow mb-3 text-warn">{label}</p>
      {paragraphs && paragraphs.length > 0 && (
        <div className="space-y-3 text-[14px] leading-relaxed text-ink-soft">
          {paragraphs.map((text, i) => <p key={i}>{text}</p>)}
        </div>
      )}
    </div>
  );
}

/* ---------------- Sections ---------------- */

export function RichSectionBlock({ section, index, headingLevel = 2 }: { section: RichSection; index: number; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const headingId = section.heading ? `s-${index}-${slugify(section.heading)}` : undefined;

  if (section.placeholder) {
    return (
      <section aria-labelledby={headingId} className="scroll-mt-28">
        {section.heading && <Heading id={headingId} className="display-3 mb-5 text-ink">{section.heading}</Heading>}
        <PlaceholderBox paragraphs={section.paragraphs} />
      </section>
    );
  }

  if (section.image) {
    const imageFirst = index % 2 === 1;
    return (
      <section aria-labelledby={headingId} className="grid scroll-mt-28 items-center gap-8 lg:grid-cols-2 lg:gap-16">
        <div className={cn("relative aspect-[4/5] overflow-hidden rounded-md bg-ivory-200 sm:aspect-[5/4] lg:aspect-[4/5]", imageFirst ? "lg:order-1" : "lg:order-2")}>
          <Image src={section.image.src} alt={section.image.alt} fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
        </div>
        <div className={cn(imageFirst ? "lg:order-2" : "lg:order-1")}>
          {section.heading && <Heading id={headingId} className="display-3 mb-5 text-ink">{section.heading}</Heading>}
          <Paragraphs items={section.paragraphs} />
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby={headingId} className="scroll-mt-28">
      {section.heading && <Heading id={headingId} className="display-3 mb-5 max-w-2xl text-ink">{section.heading}</Heading>}
      <Paragraphs items={section.paragraphs} />
    </section>
  );
}

export function RichSections({ sections, className, headingLevel }: { sections: RichSection[]; className?: string; headingLevel?: 2 | 3 }) {
  if (sections.length === 0) return null;
  return (
    <div className={cn("space-y-16 sm:space-y-20 lg:space-y-24", className)}>
      {sections.map((section, i) => <RichSectionBlock key={i} section={section} index={i} headingLevel={headingLevel} />)}
    </div>
  );
}

/* ---------------- Full page ---------------- */

export function CmsPage({ page, eyebrow, crumbs, image, children }: { page: CmsPageType; eyebrow?: string; crumbs?: Crumb[]; image?: { src: string; alt: string }; children?: React.ReactNode }) {
  return (
    <article>
      <PageHeader eyebrow={eyebrow} title={page.title} intro={page.intro} crumbs={crumbs} image={image} />
      <div className="container-x py-14 sm:py-20 lg:py-24">
        {page.placeholder && (
          <p className="mb-10 text-[13px] text-ink-soft">
            Zuletzt aktualisiert: <span className="rounded-sm border border-dashed border-stone px-1.5 py-0.5">[Datum]</span>
          </p>
        )}
        <RichSections sections={page.sections} />
        {children}
      </div>
    </article>
  );
}

