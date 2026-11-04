import Image from "next/image";
import Link from "next/link";
import { Info } from "lucide-react";
import type { Product } from "@/types";
import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { routes } from "@/lib/urls";

/** Below-the-fold product information. Server component; the accordion itself is interactive. */
export function ProductDetails({ product }: { product: Product }) {
  const items: AccordionItem[] = [
    {
      id: "beschreibung",
      title: "Beschreibung",
      content: <p className="text-pretty">{product.description}</p>,
    },
    {
      id: "blumen",
      title: "Blumen im Strauß",
      content: (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {product.flowers.map((f) => (
            <li key={f} className="flex items-center gap-2 before:size-1 before:rounded-full before:bg-forest">{f}</li>
          ))}
        </ul>
      ),
    },
    {
      id: "pflege",
      title: "Pflegehinweise",
      content: (
        <ol className="space-y-2">
          {product.care.map((c, i) => (
            <li key={c} className="flex gap-3"><span className="font-serif text-lg leading-none text-forest">{i + 1}.</span><span>{c}</span></li>
          ))}
        </ol>
      ),
    },
    {
      id: "lieferung",
      title: "Lieferung & Verpackung",
      content: (
        <div className="space-y-3">
          <p>Dein Strauß wird am Liefertag frisch gebunden, in Seidenpapier und Kraftpapier eingeschlagen und aufrecht in Wasser transportiert – so kommt er genauso an, wie er unsere Werkstatt verlassen hat.</p>
          <p>Die Liefergebühr richtet sich nach dem Liefergebiet und wird nach Eingabe der Postleitzahl angezeigt. Alle Gebiete, Zeitfenster und Bestellschlusszeiten findest du unter <Link href={routes.delivery} className="text-forest underline underline-offset-2">Lieferung & Versand</Link>.</p>
        </div>
      ),
    },
  ];

  return (
    <section className="container-x py-16 lg:py-24" aria-labelledby="product-details-title">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <p className="eyebrow mb-3">Gut zu wissen</p>
          <h2 id="product-details-title" className="display-3 mb-6 text-ink">Alles über {product.name}</h2>
          <Accordion items={items} defaultOpen="beschreibung" />
        </div>
        <aside className="lg:col-span-5 lg:pt-16">
          <div className="overflow-hidden rounded-lg border border-line bg-white/50">
            <div className="relative aspect-[16/10] bg-ivory-200">
              <Image src="/images/products/packaging.jpg" alt="Verpackung in Seidenpapier und Kraftpapier mit Leinenband" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            </div>
            <div className="p-6 sm:p-7">
              <p className="flex items-center gap-2 font-serif text-[22px] text-ink"><Info className="size-4 text-forest" strokeWidth={1.6} aria-hidden /> Sieht der Strauß genau so aus?</p>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">
                Fast. Blumen sind Naturprodukte: Je nach Saison und Tagesfrische kann eine Sorte oder Farbnuance variieren. Unsere Florist:innen halten dabei immer Stil, Farbwelt und Wert des Straußes ein – damit er so ankommt, wie du ihn dir vorgestellt hast.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
