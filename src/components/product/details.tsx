import Image from "next/image";
import Link from "@/components/ui/link";
import { Info } from "lucide-react";
import type { Product } from "@/types";
import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { routes } from "@/lib/urls";

/** Below-the-fold product information. Server component; the accordion itself is interactive. */
export function ProductDetails({ product }: { product: Product }) {
  // The note card shows the product's own detail photo when there is one; otherwise it stands on its own.
  const detailImage = product.images.find((img, i) => i > 0 && img.kind === "detail");
  const isPlant = product.category === "pflanzen";
  const isBouquet = !isPlant && product.category !== "blumenboxen" && product.category !== "advent" && !/kranz|box/i.test(product.name);
  const items: AccordionItem[] = [
    {
      id: "beschreibung",
      title: "Beschreibung",
      content: <p className="text-pretty">{product.description}</p>,
    },
    ...(product.flowers.length === 0 ? [] : [{
      id: "blumen",
      title: isPlant ? "Pflanze" : "Enthaltene Blumen",
      content: (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {product.flowers.map((f) => (
            <li key={f} className="flex items-center gap-2 before:size-1 before:rounded-full before:bg-forest">{f}</li>
          ))}
        </ul>
      ),
    }]),
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
      title: "Lieferung",
      content: (
        <div className="space-y-3">
          <p>Deine Blumen kommen von einer Wiener Floristik, mit der wir fest zusammenarbeiten. Sträuße werden dort für deine Bestellung von Hand gebunden. Ein Kurier holt sie ab und fährt ohne Zwischenstopp zur Empfängeradresse.</p>
          <p>Wir liefern in alle 23 Wiener Bezirke. Die Liefergebühr richtet sich nach dem Bezirk und wird nach Eingabe der Postleitzahl angezeigt. Liefergebiete, Zeitfenster und Bestellfristen findest du unter <Link href={routes.delivery} className="text-forest underline underline-offset-2">Lieferung & Versand</Link>.</p>
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
            {detailImage && (
              <div className="relative aspect-[16/10] bg-ivory-200">
                <Image src={detailImage.src} alt={detailImage.alt} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
              </div>
            )}
            <div className="p-6 sm:p-7">
              <p className="flex items-center gap-2 font-serif text-[22px] text-ink"><Info className="size-4 text-forest" strokeWidth={1.6} aria-hidden /> {isPlant ? "Sieht die Pflanze genau so aus?" : isBouquet ? "Sieht der Strauß genau so aus?" : "Sieht es genau so aus wie am Foto?"}</p>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">
                {isPlant
                  ? "Fast. Pflanzen sind Naturprodukte: Wuchs, Größe und Blüte können vom Foto abweichen. Auch der Übertopf kann je nach Verfügbarkeit anders aussehen."
                  : "Fast. Blumen sind Naturprodukte: Je nach Saison kann eine Sorte oder Farbnuance abweichen. Unsere Partnerfloristik achtet darauf, dass Stil und Farbwelt erhalten bleiben."}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
