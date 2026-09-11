import type { Product } from "@/types";
import { ProductCard } from "@/components/shop/product-card";
import { ProductCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/format";

const gridCls = "grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4";

/** 2 columns on mobile & tablet, 3 on laptop, 4 on desktop. Cards have no borders – whitespace does the work. */
export function ProductGrid({ products, showSameDay = false, className, priorityCount = 4 }: {
  products: Product[]; showSameDay?: boolean; className?: string; priorityCount?: number;
}) {
  return (
    <ul className={cn(gridCls, className)}>
      {products.map((p, i) => (
        <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 7) * 40}ms` }}>
          <ProductCard product={p} priority={i < priorityCount} showSameDay={showSameDay} sizesAttr="(min-width: 1280px) 24vw, (min-width: 1024px) 30vw, 46vw" />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8, withToolbar = false }: { count?: number; withToolbar?: boolean }) {
  return (
    <div role="status" className="flex flex-col gap-6" aria-busy="true" aria-label="Sträuße werden geladen">
      {withToolbar && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-36" />
        </div>
      )}
      <div className={gridCls}>
        {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
