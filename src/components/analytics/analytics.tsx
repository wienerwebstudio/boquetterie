"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { hasAnalyticsConsent, useConsent } from "@/components/consent/store";

/**
 * Consent-gated analytics loader. Nothing is requested from third parties until
 * `consent.analytics` is true. Supports Plausible, GA4, Umami and Microsoft Clarity,
 * each configured purely through public env vars (see docs/ANALYTICS.md):
 *
 *   NEXT_PUBLIC_PLAUSIBLE_DOMAIN   e.g. "blumora.at"
 *   NEXT_PUBLIC_PLAUSIBLE_API      optional data-api endpoint (proxying)
 *   NEXT_PUBLIC_PLAUSIBLE_SRC      optional script URL (proxying / self-hosted)
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID  e.g. "G-XXXXXXXXXX"
 *   NEXT_PUBLIC_UMAMI_WEBSITE_ID   website UUID from the Umami dashboard
 *   NEXT_PUBLIC_UMAMI_SRC          optional script URL (self-hosted)
 *   NEXT_PUBLIC_UMAMI_DOMAINS      optional data-domains, e.g. "blumora.at"
 *   NEXT_PUBLIC_CLARITY_PROJECT_ID project ID from the Clarity dashboard
 *
 * Page views: Plausible and Umami track SPA navigations themselves; for GA4 we send
 * `page_view` on every pathname change; Clarity records the session itself.
 * Withdrawing consent disables GA and removes its cookies (best-effort), unloads the
 * Plausible script tag, makes Umami's before-send hook drop every further event and
 * tells Clarity via Consent API v2 that storage is denied (and removes its cookies).
 */

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const PLAUSIBLE_API = process.env.NEXT_PUBLIC_PLAUSIBLE_API;
const PLAUSIBLE_SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "https://plausible.io/js/script.js";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const UMAMI_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const UMAMI_SRC = process.env.NEXT_PUBLIC_UMAMI_SRC || "https://cloud.umami.is/script.js";
const UMAMI_DOMAINS = process.env.NEXT_PUBLIC_UMAMI_DOMAINS;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

type Loaded = { plausible: boolean; ga: boolean; umami: boolean; clarity: boolean };
const nothingLoaded: Loaded = { plausible: false, ga: false, umami: false, clarity: false };

export function Analytics() {
  const analytics = useConsent((s) => s.hydrated && Boolean(s.consent?.analytics));
  const marketing = useConsent((s) => s.hydrated && Boolean(s.consent?.marketing));
  const pathname = usePathname();
  const loaded = useRef<Loaded>({ ...nothingLoaded });
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
      if (UMAMI_ID && !loaded.current.umami) {
        loadUmami(UMAMI_ID);
        loaded.current.umami = true;
      }
      if (CLARITY_ID) {
        if (!loaded.current.clarity) {
          loadClarity(CLARITY_ID);
          loaded.current.clarity = true;
        }
        setClarityConsent(true, marketing);
      }
      return;
    }
    // Consent missing or withdrawn.
    if (loaded.current.ga && GA_ID) disableGa(GA_ID);
    if (loaded.current.plausible) unloadPlausible();
    // Umami needs no unloading: its before-send hook checks consent on every event.
    if (loaded.current.clarity) disableClarity();
    loaded.current = { ...nothingLoaded, umami: loaded.current.umami, clarity: loaded.current.clarity };
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
  s.dataset.blAnalytics = "plausible";
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

/* ---------------- Umami ---------------- */

const UMAMI_BEFORE_SEND = "blUmamiBeforeSend";

function loadUmami(websiteId: string) {
  if (document.querySelector('script[data-bl-analytics="umami"]')) return;
  // Must exist before the tracker loads. Drops every event once consent is withdrawn,
  // because the already running tracker keeps its history hook until the next page load.
  window.blUmamiBeforeSend = (_type: string, payload: unknown) => (hasAnalyticsConsent() ? payload : false);
  const s = document.createElement("script");
  s.defer = true;
  s.src = UMAMI_SRC;
  s.dataset.websiteId = websiteId;
  s.dataset.beforeSend = UMAMI_BEFORE_SEND;
  if (UMAMI_DOMAINS) s.dataset.domains = UMAMI_DOMAINS;
  s.dataset.blAnalytics = "umami";
  document.head.appendChild(s);
}

/* ---------------- Microsoft Clarity ---------------- */

function loadClarity(projectId: string) {
  if (document.querySelector('script[data-bl-analytics="clarity"]')) return;
  if (!window.clarity) {
    // Official queue stub: calls made before the tag arrives are replayed by it.
    const queue: unknown[] = [];
    function clarity() {
      queue.push(arguments); // eslint-disable-line prefer-rest-params
    }
    window.clarity = Object.assign(clarity, { q: queue }) as (...args: unknown[]) => void;
  }
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
  s.dataset.blAnalytics = "clarity";
  document.head.appendChild(s);
}

/** Consent API v2 – statistics maps to analytics_Storage, marketing to ad_Storage. */
function setClarityConsent(analytics: boolean, marketing: boolean) {
  window.clarity?.("consentv2", {
    ad_Storage: marketing ? "granted" : "denied",
    analytics_Storage: analytics ? "granted" : "denied",
  });
}

function disableClarity() {
  setClarityConsent(false, false);
  removeCookies((n) => n === "_clck" || n === "_clsk" || n === "CLID" || n === "MUID");
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
    s.dataset.blAnalytics = "ga";
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
  removeCookies((n) => n === "_ga" || n === "_gid" || n.startsWith("_ga_") || n.startsWith("_gat"));
}

/** Best-effort removal of matching cookies on the current host and its parent domains. */
function removeCookies(match: (name: string) => boolean) {
  let names: string[] = [];
  try {
    names = document.cookie
      .split("; ")
      .map((c) => c.split("=")[0])
      .filter(match);
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
