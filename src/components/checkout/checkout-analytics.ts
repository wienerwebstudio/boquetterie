import type { DeliveryDay } from "@/lib/delivery";

/**
 * Pure helpers for the checkout's analytics events (unit tested in tests/unit/checkout-analytics.test.ts).
 * No personal data leaves here: only zone ids, slot kinds, day counts and error keys.
 */

/** Today's earliest free window = "Express" (1–2 h, no surcharge) – same rule as the badge in step 2. */
export function expressWindowId(day: Pick<DeliveryDay, "sameDay" | "windows"> | undefined): string | undefined {
  return day?.sameDay ? day.windows.find((w) => w.surcharge === 0)?.id : undefined;
}

/** Whole days between two ISO dates (b − a). */
export function daysBetween(a: string, b: string): number {
  const t = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  return Math.round((t(b) - t(a)) / 86_400_000);
}

/** Kind of the chosen slot: "express" | "same_day" | "scheduled", with how many days ahead. */
export function slotInfo(days: DeliveryDay[], date: string, windowId: string, today?: string): { slot_type: "express" | "same_day" | "scheduled"; days_ahead: number; express: boolean } {
  const day = days.find((d) => d.date === date);
  const express = Boolean(windowId) && expressWindowId(day) === windowId;
  const base = today ?? days.find((d) => d.sameDay)?.date ?? date;
  return { slot_type: express ? "express" : day?.sameDay ? "same_day" : "scheduled", days_ahead: Math.max(0, daysBetween(base, date)), express };
}

/** Field errors of step 1 → one stable code (the first field), e.g. "zip_not_served", "street_missing". */
export function addressErrorCode(errors: Record<string, string>, zoneAvailable: boolean | null): string {
  if (zoneAvailable === false) return "zip_not_served";
  const key = Object.keys(errors)[0];
  return key ? `${key.replace(/[^a-z]/gi, "_").toLowerCase()}_invalid` : "unknown";
}

/** Stripe error → short, safe code (never the message text). */
export function safeErrorCode(err: { type?: string; code?: string; decline_code?: string } | null | undefined): string {
  const code = err?.decline_code || err?.code || err?.type || "unknown";
  return code.replace(/[^a-z0-9_]/gi, "_").slice(0, 60);
}
