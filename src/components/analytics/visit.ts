import { attributionFromTouch, type Attribution } from "@/lib/attribution";
import { hasAnalyticsConsent } from "@/components/consent/store";

/**
 * The visit in the browser: where it came from (channel, kept in memory for this page load) and,
 * ONLY with statistics consent, a random visitor id in localStorage (`bl-visit`, 30 days). The id
 * is sent with every Umami event (`id` = Umami distinct id) and with the order, so the server can
 * report `purchase` / `refund` to the same Umami session – revenue lands on the right channel.
 * Without consent nothing is stored; the order only gets the coarse channel of this page load.
 */

const KEY = "bl-visit";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const OWN_HOSTS = ["blumora.at", "localhost"];

interface StoredVisit { id: string; at: number; attr: Attribution }

let firstTouch: Attribution | null = null;

/** First touch of this page load (referrer + landing URL), computed once. */
function touch(): Attribution {
  if (!firstTouch) {
    firstTouch = typeof window === "undefined"
      ? { channel: "direct" }
      : attributionFromTouch({ referrer: document.referrer, url: window.location.href, ownHosts: [window.location.hostname, ...OWN_HOSTS] });
  }
  return firstTouch;
}

// Capture the landing page as early as possible (before client-side navigation changes the URL).
if (typeof window !== "undefined") touch();

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 14)}`.padEnd(20, "0");
  }
}

function read(): StoredVisit | null {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as StoredVisit | null;
    return v && typeof v.id === "string" && typeof v.at === "number" && v.attr ? v : null;
  } catch {
    return null;
  }
}

/** Visitor id + attribution. The id exists only with consent (created on first use). */
export function currentVisit(): { visitorId?: string; attribution: Attribution } {
  const now = touch();
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return { attribution: now };
  let v = read();
  if (!v || Date.now() - v.at > MAX_AGE_MS) v = { id: newId(), at: Date.now(), attr: now };
  // Last non-direct touch wins (a later visit from Google replaces an older direct one).
  else if (now.channel !== "direct") v = { ...v, attr: now };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* private mode: works for this page load only */
  }
  return { visitorId: v.id, attribution: v.attr };
}

/** Removes the stored visit (consent withdrawn). */
export function forgetVisit() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
