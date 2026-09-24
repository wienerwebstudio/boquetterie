import Link from "next/link";
import { ArrowRight, CalendarDays, Info, MapPin } from "lucide-react";
import type { Occasion, Product } from "@/types";
import { getAllProducts, getCategories, getDeliveryZones, getOccasions, getSettings } from "@/lib/cms";
import { applyFilter, sortProducts } from "@/lib/catalog";
import { findZone, getAvailableDays, getLocalNow } from "@/lib/delivery";
import { formatDateLong, formatDateShort, cn } from "@/lib/format";
import { routes } from "@/lib/urls";
import { countActiveFilters, roughlyDeliverableOn, shopHref, toProductFilter, type FilterKey, type FilterOptions, type ShopParams } from "@/lib/shop-filters";
import { Button } from "@/components/ui/button";
import { ShopToolbar } from "./shop-toolbar";
import { ProductGrid } from "./product-grid";

export interface FixedFilter { category?: string; occasions?: string[] }

interface DeliveryInfo {
  tone: "ok" | "warn" | "neutral";
  icon: "pin" | "calendar" | "info";
  text: string;
  nextDate?: string;
}

/**
 * Async server component: loads content, applies URL filters (+ delivery-date
 * availability when a PLZ is given), and renders toolbar, chips and grid.
 * Wrapped in <Suspense> by the listing so it streams in after the page shell.
 */
export async function ProductResults({ params, pathname, fixed = {}, hide = [], options }: {
  params: ShopParams; pathname: string; fixed?: FixedFilter; hide?: FilterKey[]; options: FilterOptions;
}) {
  const [products, categories, occasions, settings, zones] = await Promise.all([
    getAllProducts(), getCategories(), getOccasions(), getSettings(), getDeliveryZones(),
  ]);
  const now = getLocalNow(settings.timezone);
  const filter = toProductFilter(params, fixed);
  let list = applyFilter(products, filter, categories);

  let showSameDay = params.sameday;
  let info: DeliveryInfo | null = null;
  const datum = params.datum && params.datum >= now.date ? params.datum : null;
  const zone = params.plz ? findZone(params.plz, zones) : null;

  if (params.datum && !datum) {
    info = { tone: "warn", icon: "calendar", text: "Das gewählte Lieferdatum liegt in der Vergangenheit – bitte wähle einen neuen Tag." };
  } else if (zone) {
    const zoneDays = getAvailableDays({ zone, settings, now });
    const sameDayToday = zoneDays.some((d) => d.sameDay);
    if (sameDayToday) showSameDay = true;
    if (datum) {
      list = list.filter((p) => getAvailableDays({ zone, settings, now, product: p }).some((d) => d.date === datum));
      const dayOk = zoneDays.some((d) => d.date === datum);
      if (dayOk) {
        info = { tone: "ok", icon: "calendar", text: `Lieferung nach ${params.plz} (${zone.name}) am ${formatDateLong(datum)} möglich.${datum === now.date ? ` Bestellung bis ${zone.sameDayCutoff} Uhr.` : ""}` };
      } else {
        const next = zoneDays.find((d) => d.date > datum) ?? zoneDays[0];
        info = { tone: "warn", icon: "calendar", text: `Am ${formatDateShort(datum)} liefern wir nach ${params.plz} leider nicht.`, nextDate: next?.date };
      }
    } else {
      const first = zoneDays[0];
      const tail = sameDayToday
        ? `Heute lieferbar bei Bestellung bis ${zone.sameDayCutoff} Uhr.`
        : first ? `Nächste Lieferung ${formatDateShort(first.date)}.` : "";
      info = { tone: "ok", icon: "pin", text: `Lieferung nach ${params.plz} · ${zone.name}. ${tail}`.trim() };
    }
  } else if (params.plz) {
    if (datum) list = list.filter((p) => roughlyDeliverableOn(p, datum, now.date));
    info = { tone: "warn", icon: "pin", text: `An ${params.plz} liefern wir derzeit leider noch nicht. Alle Liefergebiete findest du unter Lieferung & Versand.` };
  } else if (datum) {
    list = list.filter((p) => roughlyDeliverableOn(p, datum, now.date));
    info = { tone: "neutral", icon: "info", text: `Sträuße für ${formatDateLong(datum)}. Gib deine Postleitzahl an, um die Lieferbarkeit an diesem Tag genau zu prüfen.` };
  }

  list = sortProducts(list, params.sort);
  const activeCount = countActiveFilters(params, hide);

  return (
    <div className="flex flex-col gap-6">
      <ShopToolbar count={list.length} options={options} hide={hide} />
      {info && <DeliveryInfoLine info={info} params={params} pathname={pathname} />}
      {list.length > 0 ? (
        <>
          <h2 className="sr-only">Sträuße</h2>
          <ProductGrid products={list} showSameDay={showSameDay} />
        </>
      ) : (
        <EmptyState pathname={pathname} params={params} activeCount={activeCount} occasions={occasions.filter((o) => o.featured).slice(0, 3)} fallback={sortProducts(products, "bestseller").slice(0, 4)} info={info} />
      )}
    </div>
  );
}

function DeliveryInfoLine({ info, params, pathname }: { info: DeliveryInfo; params: ShopParams; pathname: string }) {
  const Icon = info.icon === "pin" ? MapPin : info.icon === "calendar" ? CalendarDays : Info;
  return (
    <p
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-4 py-3 text-[13.5px] leading-snug",
        info.tone === "ok" && "bg-[#e9f1ec] text-forest",
        info.tone === "warn" && "bg-rose-100 text-burgundy",
        info.tone === "neutral" && "bg-ivory-100 text-ink-muted",
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.7} aria-hidden />
      <span>{info.text}</span>
      {info.nextDate && (
        <Link href={shopHref(pathname, { ...params, datum: info.nextDate })} className="inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline">
          Nächster Liefertag: {formatDateShort(info.nextDate)} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      )}
      {info.tone === "warn" && info.icon === "pin" && (
        <Link href={routes.delivery} className="font-semibold underline-offset-4 hover:underline">Liefergebiete ansehen</Link>
      )}
    </p>
  );
}

function EmptyState({ pathname, params, activeCount, occasions, fallback, info }: {
  pathname: string; params: ShopParams; activeCount: number; occasions: Occasion[]; fallback: Product[]; info: DeliveryInfo | null;
}) {
  return (
    <div className="flex flex-col gap-10 py-6">
      <div className="max-w-xl">
        <h2 className="display-3 text-ink">Dafür haben wir gerade keinen Strauß.</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
          {info?.nextDate
            ? "An diesem Tag liefern wir in dein Gebiet nicht – am nächsten Liefertag aber gerne."
            : activeCount > 0
              ? "Versuch es mit weniger Filtern oder schau dir unsere Lieblingssträuße an."
              : "Schau in einer anderen Kollektion vorbei – oder lass dich von unseren Anlässen inspirieren."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {info?.nextDate && (
            <Button href={shopHref(pathname, { ...params, datum: info.nextDate })} size="md">
              {formatDateShort(info.nextDate)} wählen
            </Button>
          )}
          {activeCount > 0 && <Button href={pathname} variant={info?.nextDate ? "outline" : "primary"} size="md">Filter zurücksetzen</Button>}
          <Button href={routes.category("bestseller")} variant="outline" size="md">Bestseller ansehen</Button>
        </div>
        {occasions.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-2">
            {occasions.map((o) => (
              <li key={o.slug}>
                <Link href={routes.occasion(o.slug)} className="inline-flex h-9 items-center rounded-full border border-line bg-white px-4 text-[13px] text-ink transition-colors hover:border-forest hover:text-forest">
                  {o.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {fallback.length > 0 && (
        <div>
          <p className="eyebrow mb-5">Vielleicht gefällt dir</p>
          <ProductGrid products={fallback} priorityCount={0} />
        </div>
      )}
    </div>
  );
}
