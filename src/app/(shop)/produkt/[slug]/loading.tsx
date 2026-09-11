import { Skeleton } from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <div className="container-x py-6 lg:py-10" aria-busy="true" aria-label="Produkt wird geladen">
      <Skeleton className="mb-8 h-3 w-48" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-14 xl:gap-20">
        <div className="flex gap-4">
          <div className="hidden w-20 flex-col gap-3 lg:flex">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[4/5] w-full" />)}
          </div>
          <Skeleton className="aspect-[4/5] w-full rounded-md" />
        </div>
        <div className="flex flex-col gap-5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}
