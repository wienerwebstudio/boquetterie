import Image from "next/image";
import { pageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import type { CmsPage as CmsPageType, RichSection } from "@/types";
import { cn, slugify } from "@/lib/format";
import { PageHeader } from "./page-header";
import { Paragraphs } from "./prose";
import type { Crumb } from "@/components/ui/breadcrumbs";
import { currentLocale, getI18n } from "@/i18n/server";

/* ---------------- Metadata helper ---------------- */

/** A page that still consists of operator placeholders must not be indexed. */
export function isPlaceholderPage(page: CmsPageType | null) {
  return Boolean(page && (page.placeholder || (page.sections.length > 0 && page.sections.every((s) => s.placeholder))));
}

export function cmsMetadata(page: CmsPageType | null, fallbackTitle: string, canonical: string): Promise<Metadata> {
  return pageMetadata({
    title: page?.seo.title ?? fallbackTitle,
    description: page?.seo.description,
    path: canonical,
    noindex: isPlaceholderPage(page),
  });
}

/**
 * Metadata for legal pages: their text exists only in German, so other languages
 * point their canonical at the German URL and stay out of the index.
 */
export async function legalMetadata(page: CmsPageType | null, fallbackTitle: string, canonical: string): Promise<Metadata> {
  const locale = await currentLocale();
  const meta = await pageMetadata({
    title: page?.seo.title ?? fallbackTitle,
    description: page?.seo.description,
    path: canonical,
    noindex: isPlaceholderPage(page) || locale !== "de",
    locales: ["de"],
  });
  return locale === "de" ? meta : { ...meta, alternates: { ...meta.alternates, canonical } };
}

/** Shown above a legal text in every language but German: the German version applies. */
export async function GermanVersionNotice({ className }: { className?: string }) {
  const { m, locale } = await getI18n();
  if (locale === "de") return null;
  return (
    <div className={cn("mb-12 max-w-2xl rounded-md border border-line bg-ivory-100/70 p-5 sm:p-6", className)} role="note">
      <p className="text-[14px] leading-relaxed text-ink-muted">{m.common.germanVersionApplies}</p>
    </div>
  );
}

/* ---------------- Placeholder box ---------------- */

/**
 * Public stand-in for content the operator still has to supply. The placeholder
 * paragraphs in the content are internal to-do notes (shown in the admin), so
 * visitors only get a neutral notice – never the note itself.
 */
export async function PlaceholderBox({ label, className }: { paragraphs?: string[]; label?: string; className?: string }) {
  const { m } = await getI18n();
  return (
    <div className={cn("max-w-2xl rounded-md border border-line bg-ivory-100/70 p-5 sm:p-6", className)} role="note">
      <p className="text-[14px] leading-relaxed text-ink-muted">{label ?? m.content.placeholderSection}</p>
    </div>
  );
}

/* ---------------- Sections ---------------- */

export function RichSectionBlock({ section, index, headingLevel = 2, dense = false }: { section: RichSection; index: number; headingLevel?: 2 | 3; dense?: boolean }) {
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
      {section.heading && <Heading id={headingId} className={cn(dense ? "mb-3 max-w-2xl font-serif text-[22px] leading-snug text-ink sm:text-2xl" : "display-3 mb-5 max-w-2xl text-ink")}>{section.heading}</Heading>}
      <Paragraphs items={section.paragraphs} />
    </section>
  );
}

export function RichSections({ sections, className, headingLevel, dense = false }: { sections: RichSection[]; className?: string; headingLevel?: 2 | 3; dense?: boolean }) {
  if (sections.length === 0) return null;
  return (
    <div className={cn(dense ? "space-y-10 sm:space-y-12" : "space-y-16 sm:space-y-20 lg:space-y-24", className)}>
      {sections.map((section, i) => <RichSectionBlock key={i} section={section} index={i} headingLevel={headingLevel} dense={dense} />)}
    </div>
  );
}

/* ---------------- Full page ---------------- */

/** `dense`: tighter spacing and smaller headings for long legal texts. `before` renders above the sections. */
export function CmsPage({ page, eyebrow, crumbs, image, children, before, dense = false }: { page: CmsPageType; eyebrow?: string; crumbs?: Crumb[]; image?: { src: string; alt: string }; children?: React.ReactNode; before?: React.ReactNode; dense?: boolean }) {
  return (
    <article>
      <PageHeader eyebrow={eyebrow} title={page.title} intro={page.intro} crumbs={crumbs} image={image} />
      <div className="container-x py-14 sm:py-20 lg:py-24">
        {before}
        <RichSections sections={page.sections} dense={dense} />
        {children}
      </div>
    </article>
  );
}

