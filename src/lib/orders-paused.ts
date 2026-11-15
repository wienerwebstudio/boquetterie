/**
 * Ordering switch for a public preview: with NEXT_PUBLIC_ORDERS_PAUSED=true the
 * shop is browsable but nothing can be ordered – the product page shows a notice
 * instead of "In den Warenkorb", the checkout shows the same notice and the order
 * API refuses (503). Used while payments, database and mail are not set up yet.
 * NEXT_PUBLIC_* is inlined at build time: changing it needs a new deploy.
 */
export function ordersPaused() {
  return process.env.NEXT_PUBLIC_ORDERS_PAUSED === "true";
}

export const ORDERS_PAUSED_MESSAGE = "Online-Bestellungen sind in Kürze möglich. Wir richten gerade die letzten Details ein.";
