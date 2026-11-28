import Link from "@/components/ui/link";
import { ArrowRight } from "lucide-react";
import { routes } from "@/lib/urls";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/i18n/server";

export async function NotFoundView() {
  const { m } = await getI18n();
  const t = m.layout.notFound;
  const links = [
    { label: t.discoverFlowers, href: routes.shop },
    { label: t.byOccasion, href: routes.occasions },
    { label: t.delivery, href: routes.delivery },
  ];
  return (
    <section className="container-x flex min-h-[60vh] flex-col justify-center py-20 sm:py-28">
      <div className="max-w-2xl">
        <p className="eyebrow mb-4 animate-fade-up">404</p>
        <h1 className="display-1 text-balance text-ink animate-fade-up" style={{ animationDelay: "60ms" }}>{t.title}</h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-ink-muted animate-fade-up sm:text-lg" style={{ animationDelay: "120ms" }}>
          {t.text}
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center animate-fade-up" style={{ animationDelay: "180ms" }}>
          <Button href={routes.shop} size="lg" iconRight={<ArrowRight className="size-4" aria-hidden />}>{t.discoverFlowers}</Button>
          <Button href={routes.home} variant="outline" size="lg">{t.toHome}</Button>
        </div>
        <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-8 text-[14px]">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="group inline-flex items-center gap-1.5 text-ink transition-colors hover:text-forest">
                {l.label} <ArrowRight className="size-3.5 text-stone transition-transform group-hover:translate-x-1 group-hover:text-forest" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
