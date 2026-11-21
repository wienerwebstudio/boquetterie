import Image from "next/image";
import Link from "@/components/ui/link";
import { Info } from "lucide-react";
import type { Product } from "@/types";
import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { routes } from "@/lib/urls";
import { getI18n } from "@/i18n/server";

/** Below-the-fold product information. Server component; the accordion itself is interactive. */
export async function ProductDetails({ product }: { product: Product }) {
  const { m, fmt } = await getI18n();
  const t = m.product.details;
  const [areasBefore, areasAfter] = t.deliveryAreas.split("{link}");
  // The note card shows the product's own detail photo when there is one; otherwise it stands on its own.
  const detailImage = product.images.find((img, i) => i > 0 && img.kind === "detail");
  const isPlant = product.category === "pflanzen";
  const isBouquet = !isPlant && product.category !== "blumenboxen" && product.category !== "advent" && !/kranz|box/i.test(product.name);
  const items: AccordionItem[] = [
    {
      id: "beschreibung",
      title: t.description,
      content: <p className="text-pretty">{product.description}</p>,
    },
    ...(product.flowers.length === 0 ? [] : [{
      id: "blumen",
      title: isPlant ? t.plant : t.flowers,
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
      title: t.care,
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
      title: t.delivery,
      content: (
        <div className="space-y-3">
          <p>{t.deliveryText}</p>
          <p>{areasBefore}<Link href={routes.delivery} className="text-forest underline underline-offset-2">{t.deliveryLink}</Link>{areasAfter || null}</p>
        </div>
      ),
    },
  ];

  return (
    <section className="container-x py-16 lg:py-24" aria-labelledby="product-details-title">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <p className="eyebrow mb-3">{t.eyebrow}</p>
          <h2 id="product-details-title" className="display-3 mb-6 text-ink">{fmt(t.title, { name: product.name })}</h2>
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
              <p className="flex items-center gap-2 font-serif text-[22px] text-ink"><Info className="size-4 text-forest" strokeWidth={1.6} aria-hidden /> {isPlant ? t.looksPlant : isBouquet ? t.looksBouquet : t.looksOther}</p>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">
                {isPlant
                  ? t.naturalPlant
                  : t.naturalFlowers}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
