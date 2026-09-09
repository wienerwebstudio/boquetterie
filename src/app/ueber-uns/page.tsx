import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPageBySlug, getSettings } from "@/lib/cms";
import { JsonLd, breadcrumbLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { routes } from "@/lib/urls";
import { cn } from "@/lib/format";

const SLUG = "ueber-uns";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug(SLUG);
  if (!page) return {};
  return {
    title: page.seo.title,
    description: page.seo.description,
    alternates: { canonical: routes.about },
    openGraph: { title: page.seo.title, description: page.seo.description, images: [{ url: "/images/editorial/florist.jpg" }] },
  };
}

export default async function AboutPage() {
  const [page, settings] = await Promise.all([getPageBySlug(SLUG), getSettings()]);
  if (!page) notFound();

  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Über uns", url: routes.about }], settings)} />

      {/* Intro */}
      <section className="container-x pt-6 sm:pt-8">
        <Breadcrumbs items={[{ label: "Über uns" }]} />
        <div className="grid gap-8 py-10 sm:py-14 lg:grid-cols-12 lg:gap-12 lg:py-20">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-4">Über uns</p>
            <h1 className="display-1 max-w-[14ch] text-balance text-ink">{page.title}</h1>
          </div>
          {page.intro && (
            <div className="lg:col-span-5 lg:self-end">
              <p className="max-w-md text-pretty text-[17px] leading-relaxed text-ink-muted sm:text-[18px]">{page.intro}</p>
            </div>
          )}
        </div>
      </section>

      {/* Sections */}
      <div className="container-x pb-16 sm:pb-20 lg:pb-28">
        <div className="flex flex-col gap-16 sm:gap-20 lg:gap-28">
          {page.sections.map((s, i) => {
            const flip = i % 2 === 1;
            if (s.placeholder) {
              return (
                <section key={s.heading ?? i} aria-labelledby={`about-s-${i}`} className="mx-auto w-full max-w-3xl">
                  {s.heading && <h2 id={`about-s-${i}`} className="display-3 text-ink">{s.heading}</h2>}
                  <div className="mt-6 rounded-md border border-dashed border-stone bg-ivory-100/70 p-6 sm:p-8" role="note">
                    <p className="eyebrow mb-3 text-warn">Platzhalter – Inhalt folgt</p>
                    {s.paragraphs.map((p, j) => (
                      <p key={j} className="text-[15px] leading-relaxed text-ink-muted">{p}</p>
                    ))}
                  </div>
                </section>
              );
            }
            return (
              <section key={s.heading ?? i} aria-labelledby={`about-s-${i}`} className="grid items-center gap-8 lg:grid-cols-12 lg:gap-14">
                {s.image && (
                  <Reveal className={cn("lg:col-span-6", flip ? "lg:order-2" : "lg:order-1")}>
                    <div className={cn("relative overflow-hidden rounded-md bg-ivory-200", i === 0 ? "aspect-[4/5] sm:aspect-[5/6]" : "aspect-[4/3] sm:aspect-[5/4]")}>
                      <Image src={s.image.src} alt={s.image.alt} fill sizes="(min-width: 1440px) 640px, (min-width: 1024px) 50vw, 100vw" className="object-cover" />
                    </div>
                  </Reveal>
                )}
                <div className={cn(s.image ? cn("lg:col-span-5", flip ? "lg:order-1 lg:col-start-1" : "lg:order-2 lg:col-start-8") : "lg:col-span-8 lg:col-start-3")}>
                  <p className="font-serif text-[15px] italic tracking-[0.04em] text-ink-soft">{String(i + 1).padStart(2, "0")}</p>
                  {s.heading && <h2 id={`about-s-${i}`} className="display-2 mt-3 text-balance text-ink">{s.heading}</h2>}
                  <div className="mt-5 flex flex-col gap-4">
                    {s.paragraphs.map((p, j) => (
                      <p key={j} className="max-w-md text-pretty text-[15.5px] leading-relaxed text-ink-muted sm:text-base">{p}</p>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Closing CTA */}
      <section className="border-t border-line bg-ivory-100">
        <div className="container-x flex flex-col items-start gap-6 py-14 sm:flex-row sm:items-center sm:justify-between lg:py-20">
          <div>
            <p className="eyebrow mb-3">Bereit?</p>
            <h2 className="display-3 text-balance text-ink">Jemandem eine Freude machen.</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href={routes.shop} size="lg">Blumen entdecken</Button>
            <Button href={routes.contact} size="lg" variant="outline">Kontakt</Button>
          </div>
        </div>
      </section>
    </>
  );
}
