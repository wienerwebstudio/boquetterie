"use client";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { routes } from "@/lib/urls";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { m, fmt } = useI18n();
  const t = m.layout.error;
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="container-x flex min-h-[60vh] flex-col justify-center py-20 sm:py-28">
      <div className="max-w-2xl">
        <p className="eyebrow mb-4">{t.eyebrow}</p>
        <h1 className="display-2 text-balance text-ink">{t.title}</h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-ink-muted">
          {t.text}
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button onClick={reset} size="lg" icon={<RotateCcw className="size-4" aria-hidden />}>{t.retry}</Button>
          <Button href={routes.contact} variant="outline" size="lg">{t.contact}</Button>
        </div>
        {error.digest && <p className="mt-8 text-[12px] text-ink-soft">{fmt(t.errorCode, { code: error.digest })}</p>}
      </div>
    </section>
  );
}
