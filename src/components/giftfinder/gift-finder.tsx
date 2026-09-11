"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { Product } from "@/types";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/format";
import { events, track } from "@/components/analytics/track";
import { BUDGET_OPTIONS, FOR_OPTIONS, budgetOption, forOption, giftFinderUrl } from "./config";
import { isComplete, type CompleteGiftFinderQuery, type GiftFinderQuery, type GiftFinderResult } from "./scoring";
import { GiftFinderResults } from "./gift-finder-results";

type Step = keyof GiftFinderQuery;
const STEPS: { key: Step; index: string; label: string; question: string }[] = [
  { key: "for", index: "01", label: "Für wen?", question: "Für wen sind die Blumen?" },
  { key: "occasion", index: "02", label: "Anlass", question: "Zu welchem Anlass?" },
  { key: "budget", index: "03", label: "Budget", question: "Welches Budget?" },
];

export interface OccasionOption { slug: string; name: string }
interface Option { value: string; label: string; hint?: string }

const EMPTY: GiftFinderQuery = { for: null, occasion: null, budget: null };
const nextOpenStep = (q: GiftFinderQuery): Step | null => STEPS.find((s) => !q[s.key])?.key ?? null;

type ApiResponse = { ok: boolean; products?: Product[]; fallback?: boolean; occasionHits?: number; message?: string };

/**
 * Three-step gift finder. Selections live in the URL (`?for=&occasion=&budget=`)
 * via history.replaceState so a refresh or a shared link renders the results on
 * the server (see the page). Results for live selections come from
 * GET /api/giftfinder.
 */
export function GiftFinder({ occasions, initialQuery, initialResult }: {
  occasions: OccasionOption[];
  initialQuery: GiftFinderQuery;
  initialResult: GiftFinderResult | null;
}) {
  const [query, setQuery] = useState<GiftFinderQuery>(initialQuery);
  const [activeStep, setActiveStep] = useState<Step | null>(() => nextOpenStep(initialQuery));
  const [result, setResult] = useState<GiftFinderResult | null>(initialResult);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const scrollOnResult = useRef(false);
  const complete = isComplete(query);

  // Keep the URL in sync – replaceState is integrated with the App Router, no server round-trip.
  useEffect(() => {
    const url = giftFinderUrl(query);
    if (`${window.location.pathname}${window.location.search}` !== url) window.history.replaceState(null, "", url);
  }, [query]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const fetchResults = useCallback(async (q: CompleteGiftFinderQuery) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus("loading");
    try {
      const sp = new URLSearchParams({ for: q.for, occasion: q.occasion, budget: q.budget });
      const res = await fetch(`/api/giftfinder?${sp}`, { signal: ctrl.signal, headers: { accept: "application/json" } });
      const data = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !data?.ok || !data.products) throw new Error(data?.message || "giftfinder failed");
      setResult({ products: data.products, fallback: Boolean(data.fallback), occasionHits: data.occasionHits ?? 0 });
      setStatus("idle");
      track(events.giftFinderComplete, { for: q.for, occasion: q.occasion, budget: q.budget, results: data.products.length });
      if (scrollOnResult.current) {
        scrollOnResult.current = false;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setStatus("error");
    }
  }, []);

  const select = (step: Step, value: string) => {
    const next = { ...query, [step]: value } as GiftFinderQuery;
    setQuery(next);
    setActiveStep(nextOpenStep(next));
    if (isComplete(next)) {
      scrollOnResult.current = true;
      void fetchResults(next);
    } else {
      setResult(null);
      setStatus("idle");
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setQuery(EMPTY);
    setActiveStep("for");
    setResult(null);
    setStatus("idle");
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const optionsFor = (step: Step): Option[] => {
    if (step === "for") return FOR_OPTIONS;
    if (step === "budget") return BUDGET_OPTIONS;
    return occasions.map((o) => ({ value: o.slug, label: o.name }));
  };
  const labelFor = (step: Step): string | null => {
    const v = query[step];
    if (!v) return null;
    return optionsFor(step).find((o) => o.value === v)?.label ?? null;
  };

  const active = STEPS.find((s) => s.key === activeStep) ?? null;
  const occasion = occasions.find((o) => o.slug === query.occasion) ?? null;

  return (
    <div>
      {/* Stepper */}
      <ol className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3" aria-label="Schritte">
        {STEPS.map((s, i) => {
          const value = labelFor(s.key);
          const reachable = STEPS.slice(0, i).every((prev) => Boolean(query[prev.key]));
          const isActive = activeStep === s.key;
          return (
            <li key={s.key}>
              <button
                type="button"
                disabled={!reachable}
                aria-current={isActive ? "step" : undefined}
                onClick={() => setActiveStep(s.key)}
                className={cn(
                  "flex h-full w-full flex-col items-start gap-1.5 px-5 py-4 text-left transition-colors duration-300",
                  isActive ? "bg-white" : "bg-ivory hover:bg-ivory-100",
                  !reachable && "cursor-default opacity-50 hover:bg-ivory",
                )}
              >
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-moss">
                  <span className="font-serif text-[13px] normal-case italic tracking-normal text-ink-soft">{s.index}</span>
                  {s.label}
                  {value && <Check className="size-3.5 text-forest" strokeWidth={2.5} aria-hidden />}
                </span>
                <span className={cn("font-serif text-[22px] leading-tight", value ? "text-ink" : "italic text-ink-soft")}>
                  {value ?? "Noch offen"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Active step */}
      {active && (
        <section key={active.key} aria-labelledby="gf-step-title" className="mt-10 animate-fade-up sm:mt-12">
          <p className="eyebrow mb-3">Schritt {active.index} von 03</p>
          <h2 id="gf-step-title" className="display-3 text-ink">{active.question}</h2>
          <div role="radiogroup" aria-labelledby="gf-step-title" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {optionsFor(active.key).map((o) => {
              const selected = query[active.key] === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => select(active.key, o.value)}
                  className={cn(
                    "group flex items-center justify-between gap-4 rounded-md border px-5 py-4 text-left transition-all duration-300 ease-[var(--ease-soft)] hover:border-forest",
                    selected ? "border-forest bg-white shadow-soft" : "border-line bg-white/70",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-serif text-[22px] leading-tight text-ink">{o.label}</span>
                    {o.hint && <span className="mt-0.5 block text-[13px] text-ink-muted">{o.hint}</span>}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                      selected ? "border-forest bg-forest text-ivory" : "border-stone text-transparent group-hover:border-forest",
                    )}
                  >
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Results */}
      <div ref={resultsRef} className="mt-14 scroll-mt-24 sm:mt-16">
        {complete && status === "loading" && (
          <div aria-busy="true" aria-label="Sträuße werden gesucht" className="grid grid-cols-2 gap-x-4 gap-y-8 border-t border-line pt-10 sm:gap-x-6 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        )}
        {status === "error" && (
          <p role="alert" className="rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-danger">
            Die Empfehlungen konnten gerade nicht geladen werden. Bitte versuch es gleich noch einmal.
          </p>
        )}
        {status === "idle" && result && complete && occasion && (
          <GiftFinderResults
            products={result.products}
            fallback={result.fallback}
            occasionHits={result.occasionHits}
            forLabel={forOption(query.for)?.label ?? ""}
            occasion={occasion}
            budgetLabel={budgetOption(query.budget)?.label ?? ""}
            onReset={reset}
          />
        )}
        {!complete && (
          <p className="border-t border-line pt-8 text-[14px] leading-relaxed text-ink-soft">
            Sobald alle drei Antworten da sind, erscheinen hier unsere Empfehlungen.
          </p>
        )}
      </div>
    </div>
  );
}
