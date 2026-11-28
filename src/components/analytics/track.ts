import { hasAnalyticsConsent, useConsent } from "@/components/consent/store";

/**
 * Tiny event helper. No-ops without statistics consent and when no tool is loaded,
 * so it is safe to call from any client component. Server components must not
 * import it (it reads the consent store) – track from the client side instead.
 *
 * See docs/ANALYTICS.md for the event catalogue and where to call it.
 */

export type TrackProps = Record<string, string | number | boolean | null | undefined>;

/**
 * Event catalogue (snake_case, stable – the names show up in dashboards). Props: no personal data
 * (no names, e-mails, phone numbers, street addresses, postal codes, free text). See docs/ANALYTICS.md.
 * `purchase`, `refund`, `order_delivered`, `order_delayed`, `order_cancelled` are sent by the SERVER
 * (src/lib/analytics-server.ts), never from the browser.
 */
export const events = {
  // Products & cart
  viewItem: "view_item",
  selectVariant: "select_variant",
  addToCart: "add_to_cart",
  removeFromCart: "remove_from_cart",
  viewCart: "view_cart",
  addExtra: "add_extra",
  removeExtra: "remove_extra",
  productSearch: "product_search",
  filterUsed: "filter_used",
  searchNoResults: "search_no_results",
  // Checkout & payments
  beginCheckout: "begin_checkout",
  addressCompleted: "address_completed",
  addressValidationFailed: "address_validation_failed",
  deliverySlotSelected: "delivery_slot_selected",
  deliverySlotUnavailable: "delivery_slot_unavailable",
  deliveryFeeShown: "delivery_fee_shown",
  paymentMethodSelected: "payment_method_selected",
  paymentStarted: "payment_started",
  paymentFailed: "payment_failed",
  paymentCancelled: "payment_cancelled",
  // Marketing & languages
  languageChanged: "language_changed",
  languageSuggested: "language_suggested",
  couponApplied: "coupon_applied",
  couponInvalid: "coupon_invalid",
  whatsappClicked: "whatsapp_clicked",
  contactSubmitted: "contact_submitted",
  giftFinderStarted: "gift_finder_started",
  giftFinderCompleted: "gift_finder_completed",
  businessLead: "business_lead",
  reminderCreated: "reminder_created",
  reviewClicked: "review_clicked",
  newsletterSignup: "newsletter_signup",
  // Delivery & service
  expressSelected: "express_selected",
  postcodeChecked: "postcode_checked",
  outsideDeliveryArea: "outside_delivery_area",
} as const;

export type EventName = (typeof events)[keyof typeof events];

declare global {
  interface Window {
    plausible?: ((event: string, options?: { props?: Record<string, string | number | boolean>; callback?: () => void }) => void) & { q?: unknown[] };
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    umami?: { track: (event: string, data?: Record<string, string | number | boolean>) => void };
    clarity?: (...args: unknown[]) => void;
    blUmamiBeforeSend?: (type: string, payload: unknown) => unknown;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

/**
 * Events fired before the stored consent was read (first render, e.g. view_item on a direct
 * visit) wait here and go out once the choice is known – only if statistics are allowed.
 */
let waiting: [EventName, TrackProps][] | null = null;
function queueUntilConsentKnown(event: EventName, props: TrackProps) {
  if (!waiting) {
    waiting = [];
    const unsubscribe = useConsent.subscribe((s) => {
      if (!s.hydrated) return;
      unsubscribe();
      const queued = waiting ?? [];
      waiting = null;
      if (hasAnalyticsConsent()) for (const [e, p] of queued) send(e, p);
    });
  }
  if (waiting.length < 50) waiting.push([event, props]);
}

export function track(event: EventName, props: TrackProps = {}) {
  if (typeof window === "undefined") return;
  if (!useConsent.getState().hydrated) return queueUntilConsentKnown(event, props);
  if (!hasAnalyticsConsent()) return;
  send(event, props);
}

function send(event: EventName, props: TrackProps) {

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
  try {
    window.umami?.track(event, hasProps ? clean : undefined);
  } catch {
    /* never break the UI because of analytics */
  }
  try {
    // Clarity custom events carry no properties; they tag the recording for filtering.
    window.clarity?.("event", event);
  } catch {
    /* never break the UI because of analytics */
  }
}
