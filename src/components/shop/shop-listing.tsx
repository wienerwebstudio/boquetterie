import { Suspense } from "react";
import { getOccasions, getSettings } from "@/lib/cms";
import { addDays, getLocalNow } from "@/lib/delivery";
import { parseShopParams, serializeShopParams, type FilterKey, type FilterOptions } from "@/lib/shop-filters";
import { FilterRail } from "./filter-rail";
import { ProductGridSkeleton } from "./product-grid";
import { ProductResults, type FixedFilter } from "./product-results";

export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Listing layout shared by /blumen, /blumen/[category] and /anlaesse/[slug]:
 * sticky filter rail on desktop, toolbar + sheet on mobile, streamed product grid.
 */
export async function ShopListing({ searchParams, pathname, fixed = {}, hide = [] }: {
  searchParams: RawSearchParams; pathname: string; fixed?: FixedFilter; hide?: FilterKey[];
}) {
  const [occasions, settings] = await Promise.all([getOccasions(), getSettings()]);
  const params = parseShopParams(searchParams);
  const today = getLocalNow(settings.timezone).date;
  const options: FilterOptions = {
    occasions: occasions.map((o) => ({ value: o.slug, label: o.name })),
    today,
    maxDate: addDays(today, 45),
  };
  const key = serializeShopParams(params).toString();

  return (
    <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[236px_minmax(0,1fr)] xl:gap-16">
      <div className="hidden lg:block">
        <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pb-8 pr-1 scrollbar-none">
          <Suspense>
            <FilterRail options={options} hide={hide} />
          </Suspense>
        </div>
      </div>
      <div className="min-w-0">
        <Suspense key={key} fallback={<ProductGridSkeleton withToolbar />}>
          <ProductResults params={params} pathname={pathname} fixed={fixed} hide={hide} options={options} />
        </Suspense>
      </div>
    </div>
  );
}
