import { cn } from "@/lib/format";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Section({ className, children, id, tone = "ivory" }: { className?: string; children: React.ReactNode; id?: string; tone?: "ivory" | "ivory-100" | "forest" | "sand" | "white" }) {
  const tones = {
    ivory: "bg-ivory",
    "ivory-100": "bg-ivory-100",
    forest: "bg-forest text-ivory",
    sand: "bg-sand/50",
    white: "bg-white",
  };
  return (
    <section id={id} className={cn("py-16 sm:py-20 lg:py-28", tones[tone], className)}>
      <div className="container-x">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow, title, subtitle, align = "left", link, className, light,
}: {
  eyebrow?: string; title: string; subtitle?: string; align?: "left" | "center";
  link?: { label: string; href: string }; className?: string; light?: boolean;
}) {
  return (
    <div className={cn("mb-10 flex flex-col gap-4 sm:mb-14 sm:flex-row sm:items-end sm:justify-between", align === "center" && "sm:flex-col sm:items-center sm:text-center", className)}>
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && <p className={cn("eyebrow mb-3", light && "text-sand")}>{eyebrow}</p>}
        <h2 className={cn("display-2 text-balance", light ? "text-ivory" : "text-ink")}>{title}</h2>
        {subtitle && <p className={cn("mt-4 max-w-xl text-[15px] leading-relaxed sm:text-base", light ? "text-sand" : "text-ink-muted", align === "center" && "mx-auto")}>{subtitle}</p>}
      </div>
      {link && (
        <Link href={link.href} className={cn("group inline-flex shrink-0 items-center gap-2 text-sm font-semibold", light ? "text-ivory" : "text-forest")}>
          {link.label}
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
        </Link>
      )}
    </div>
  );
}
