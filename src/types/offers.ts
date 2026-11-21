/** Offer types shared between server and client. */
import type { OrderCreateResponse } from "@/types/payments";

/** Answer of POST /api/offers/pay. `code` lets the page pick its own (translated) message. */
export type OfferPayResponse =
  | OrderCreateResponse
  | { ok: false; code: "invalid" | "method" | "terms" | "not_found" | "paid" | "unavailable" | "payment"; message: string };
