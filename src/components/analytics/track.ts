import { hasAnalyticsConsent } from "@/components/consent/store";

/**
 * Tiny event helper. No-ops without statistics consent and when no tool is loaded,
 * so it is safe to call from any client component. Server components must not
 * import it (it reads the consent store) – track from the client side instead.
 *
 * See docs/ANALYTICS.md for the event catalogue and where to call it.
 */

export type TrackProps = Record<string, string | number | boolean | null | undefined>;

/** Event names used across the shop – keep them stable, they show up in dashboards. */
export const events = {
  addToCart: "add_to_cart",
  giftFinderComplete: "gift_finder_complete",
  businessInquiry: "business_inquiry",
  deliveryCheck: "delivery_check",
  newsletterSignup: "newsletter_signup",
} as const;

declare global {
  interface Window {
    plausible?: ((event: string, options?: { props?: Record<string, string | number | boolean>; callback?: () => void }) => void) & { q?: unknown[] };
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

export function track(event: string, props: TrackProps = {}) {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;

  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v !== undefined && v !== null) clean[k] = v;
  }
  const hasProps = Object.keys(clean).length > 0;

  try {
    window.plausible?.(event, hasProps ? { props: clean } : undefined);
  } catch {
    /* never break the UI because of analytics */
  }
  try {
    window.gtag?.("event", event, hasProps ? clean : undefined);
  } catch {
    /* never break the UI because of analytics */
  }
}
