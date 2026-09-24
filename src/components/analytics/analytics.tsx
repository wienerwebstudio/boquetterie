"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useConsent } from "@/components/consent/store";

/**
 * Consent-gated analytics loader. Nothing is requested from third parties until
 * `consent.analytics` is true. Supports Plausible and/or GA4, configured purely
 * through public env vars (see docs/ANALYTICS.md):
 *
 *   NEXT_PUBLIC_PLAUSIBLE_DOMAIN   e.g. "bloomery.at"
 *   NEXT_PUBLIC_PLAUSIBLE_API      optional data-api endpoint (proxying)
 *   NEXT_PUBLIC_PLAUSIBLE_SRC      optional script URL (proxying / self-hosted)
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID  e.g. "G-XXXXXXXXXX"
 *
 * Page views: Plausible tracks SPA navigations itself; for GA4 we send `page_view`
 * on every pathname change. Withdrawing consent disables GA and removes its
 * cookies (best-effort) and unloads the Plausible script tag.
 */

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const PLAUSIBLE_API = process.env.NEXT_PUBLIC_PLAUSIBLE_API;
const PLAUSIBLE_SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "https://plausible.io/js/script.js";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export function Analytics() {
  const analytics = useConsent((s) => s.hydrated && Boolean(s.consent?.analytics));
  const marketing = useConsent((s) => s.hydrated && Boolean(s.consent?.marketing));
  const pathname = usePathname();
  const loaded = useRef({ plausible: false, ga: false });
  const sentPath = useRef<string | null>(null);

  useEffect(() => {
    if (analytics) {
      if (PLAUSIBLE_DOMAIN && !loaded.current.plausible) {
        loadPlausible(PLAUSIBLE_DOMAIN);
        loaded.current.plausible = true;
      }
      if (GA_ID) {
        if (!loaded.current.ga) {
          loadGa(GA_ID, marketing);
          loaded.current.ga = true;
          sentPath.current = window.location.pathname; // initial page_view comes from gtag("config")
        } else {
          updateGaConsent(true, marketing);
        }
      }
      return;
    }
    // Consent missing or withdrawn.
    if (loaded.current.ga && GA_ID) disableGa(GA_ID);
    if (loaded.current.plausible) unloadPlausible();
    loaded.current = { plausible: false, ga: false };
    sentPath.current = null;
  }, [analytics, marketing]);

  // GA4 page views on client-side navigation (Plausible hooks history.pushState itself).
  useEffect(() => {
    if (!analytics || !GA_ID || !window.gtag) return;
    if (sentPath.current === pathname) return;
    sentPath.current = pathname;
    window.gtag("event", "page_view", { page_path: pathname, page_location: window.location.href, page_title: document.title });
  }, [pathname, analytics]);

  return null;
}

/* ---------------- Plausible ---------------- */

function loadPlausible(domain: string) {
  if (document.querySelector('script[data-bl-analytics="plausible"]')) return;
  if (!window.plausible) {
    const queue: unknown[] = [];
    const stub = Object.assign((...args: unknown[]) => { queue.push(args); }, { q: queue });
    window.plausible = stub as unknown as NonNullable<Window["plausible"]>;
  }
  const s = document.createElement("script");
  s.defer = true;
  s.src = PLAUSIBLE_SRC;
  s.dataset.domain = domain;
  if (PLAUSIBLE_API) s.dataset.api = PLAUSIBLE_API;
  s.dataset.bqAnalytics = "plausible";
  document.head.appendChild(s);
}

function unloadPlausible() {
  document.querySelector('script[data-bl-analytics="plausible"]')?.remove();
  try {
    delete window.plausible;
  } catch {
    /* ignore */
  }
}

/* ---------------- GA4 ---------------- */

type ConsentValue = "granted" | "denied";
function consentPayload(analytics: boolean, marketing: boolean): Record<string, ConsentValue> {
  const a: ConsentValue = analytics ? "granted" : "denied";
  const m: ConsentValue = marketing ? "granted" : "denied";
  return { analytics_storage: a, ad_storage: m, ad_user_data: m, ad_personalization: m };
}

function loadGa(id: string, marketing: boolean) {
  window.dataLayer = window.dataLayer || [];
  // gtag.js expects the `arguments` object on the dataLayer, hence a classic function.
  function gtag() {
    window.dataLayer!.push(arguments); // eslint-disable-line prefer-rest-params
  }
  window.gtag = gtag as (...args: unknown[]) => void;
  window[`ga-disable-${id}`] = false;

  // Consent mode: default everything to denied, then grant what the visitor chose.
  window.gtag("consent", "default", { ...consentPayload(false, false), wait_for_update: 500 });
  window.gtag("consent", "update", consentPayload(true, marketing));
  window.gtag("js", new Date());
  window.gtag("config", id, { anonymize_ip: true, send_page_view: true });

  if (!document.querySelector('script[data-bl-analytics="ga"]')) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    s.dataset.bqAnalytics = "ga";
    document.head.appendChild(s);
  }
}

function updateGaConsent(analytics: boolean, marketing: boolean) {
  window.gtag?.("consent", "update", consentPayload(analytics, marketing));
}

function disableGa(id: string) {
  updateGaConsent(false, false);
  window[`ga-disable-${id}`] = true;
  document.querySelector('script[data-bl-analytics="ga"]')?.remove();
  removeGaCookies();
}

/** Best-effort removal of GA cookies on the current host and its parent domains. */
function removeGaCookies() {
  let names: string[] = [];
  try {
    names = document.cookie
      .split("; ")
      .map((c) => c.split("=")[0])
      .filter((n) => n === "_ga" || n === "_gid" || n.startsWith("_ga_") || n.startsWith("_gat"));
  } catch {
    return;
  }
  const parts = window.location.hostname.split(".");
  const domains = [""];
  for (let i = 0; i < parts.length - 1; i++) {
    const d = parts.slice(i).join(".");
    domains.push(d, `.${d}`);
  }
  for (const n of names) {
    for (const d of domains) {
      document.cookie = `${n}=; Max-Age=0; Path=/${d ? `; Domain=${d}` : ""}`;
    }
  }
}
