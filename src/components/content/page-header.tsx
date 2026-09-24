import Image from "next/image";
import { cn } from "@/lib/format";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";

/**
 * Consistent hero for content and service pages: breadcrumbs, eyebrow, h1, intro,
 * optional wide image band underneath.
 */
export function PageHeader({
  eyebrow, title, intro, image, crumbs, size = "md", className, children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  image?: { src: string; alt: string };
  crumbs?: Crumb[];
  size?: "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={cn("container-x pt-8 sm:pt-12 lg:pt-16", className)}>
      {crumbs && crumbs.length > 0 && <Breadcrumbs items={crumbs} className="mb-8 sm:mb-10" />}
      <div className="max-w-3xl">
        {eyebrow && <p className="eyebrow mb-4 animate-fade-up">{eyebrow}</p>}
        <h1 className={cn("text-balance text-ink animate-fade-up", size === "lg" ? "display-1" : "display-2")} style={{ animationDelay: "60ms" }}>
          {title}
        </h1>
        {intro && (
          <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-ink-muted animate-fade-up sm:mt-6 sm:text-lg" style={{ animationDelay: "120ms" }}>
            {intro}
          </p>
        )}
        {children && <div className="mt-8 animate-fade-up" style={{ animationDelay: "180ms" }}>{children}</div>}
      </div>
      {image && (
        <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-md bg-ivory-200 sm:mt-14 sm:aspect-[21/9] lg:aspect-[3/1]">
          <Image src={image.src} alt={image.alt} fill priority sizes="(min-width: 1440px) 1312px, 100vw" className="object-cover" />
        </div>
      )}
    </header>
  );
}
