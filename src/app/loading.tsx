import { Skeleton } from "@/components/ui/skeleton";

/** Minimal route skeleton – mirrors the page header so the layout barely shifts. */
export default function Loading() {
  return (
    <div className="container-x pt-8 sm:pt-12 lg:pt-16" aria-busy="true" aria-label="Seite wird geladen">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-6 h-10 w-3/4 max-w-lg sm:h-14" />
      <Skeleton className="mt-6 h-4 w-full max-w-2xl" />
      <Skeleton className="mt-3 h-4 w-5/6 max-w-xl" />
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-40 rounded-md" />
        <Skeleton className="hidden h-40 rounded-md sm:block" />
        <Skeleton className="hidden h-40 rounded-md lg:block" />
        <Skeleton className="hidden h-40 rounded-md lg:block" />
      </div>
    </div>
  );
}
