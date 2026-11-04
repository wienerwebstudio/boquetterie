import { Skeleton, ProductCardSkeleton } from "@/components/ui/skeleton";

export default function ShopLoading() {
  return (
    <div className="container-x py-8 lg:py-12" aria-busy="true" aria-label="Sträuße werden geladen">
      <Skeleton className="mb-6 h-3 w-32" />
      <Skeleton className="mb-4 h-12 w-72" />
      <Skeleton className="mb-10 h-4 w-96 max-w-full" />
      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
