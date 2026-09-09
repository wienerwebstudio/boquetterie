"use client";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { routes } from "@/lib/urls";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="container-x flex min-h-[60vh] flex-col justify-center py-20 sm:py-28">
      <div className="max-w-2xl">
        <p className="eyebrow mb-4">Kleiner Fehler</p>
        <h1 className="display-2 text-balance text-ink">Da ist etwas schiefgelaufen.</h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-ink-muted">
          Die Seite konnte gerade nicht geladen werden. Ein neuer Versuch hilft meistens – falls nicht, sind wir über die Kontaktseite erreichbar.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button onClick={reset} size="lg" icon={<RotateCcw className="size-4" aria-hidden />}>Noch einmal versuchen</Button>
          <Button href={routes.contact} variant="outline" size="lg">Kontakt</Button>
        </div>
        {error.digest && <p className="mt-8 text-[12px] text-ink-soft">Fehlercode: {error.digest}</p>}
      </div>
    </section>
  );
}
