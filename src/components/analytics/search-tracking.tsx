"use client";
import { useEffect } from "react";
import { useI18n } from "@/i18n/client";
import { events, track } from "./track";
import { searchQueryKey } from "./event-props";

/** Queries already reported in this tab – overlay and search page share it, so Enter in the overlay is not counted twice. */
const reported = new Set<string>();

/**
 * Reports a search result: `product_search` (always) and `search_no_results` (when empty).
 * Only for queries of at least 2 characters and once per distinct query. The query text itself is never sent.
 */
export function trackSearch(query: string, resultCount: number, locale: string) {
  const key = searchQueryKey(query);
  if (key.length < 2 || reported.has(key)) return;
  reported.add(key);
  track(events.productSearch, { result_count: resultCount, locale });
  if (resultCount === 0) track(events.searchNoResults, { locale });
}

/** For the server-rendered search page: reports its result once on mount. */
export function SearchResultsTracker({ query, resultCount }: { query: string; resultCount: number }) {
  const { locale } = useI18n();
  useEffect(() => { trackSearch(query, resultCount, locale); }, [query, resultCount, locale]);
  return null;
}
