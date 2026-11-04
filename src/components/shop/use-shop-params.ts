"use client";
import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseShopParams, shopHref, type ShopParams } from "@/lib/shop-filters";

/**
 * Reads the shop filter state from the URL and pushes updates without scrolling.
 * All filter controls (rail, sheet, chips, sort) go through this hook so the
 * URL stays the single source of truth.
 */
export function useShopParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const params = useMemo(() => parseShopParams(searchParams), [searchParams]);

  const apply = useCallback((next: ShopParams) => {
    startTransition(() => {
      router.push(shopHref(pathname, next), { scroll: false });
    });
  }, [router, pathname]);

  const update = useCallback((patch: Partial<ShopParams> | ((current: ShopParams) => ShopParams)) => {
    const next = typeof patch === "function" ? patch(params) : { ...params, ...patch };
    apply(next);
  }, [params, apply]);

  return { params, update, apply, pending, pathname };
}
