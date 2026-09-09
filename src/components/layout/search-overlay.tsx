"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Clock, Loader2, Search, Sparkles, X } from "lucide-react";
import { useUi } from "@/store/ui";
import { routes } from "@/lib/urls";
import { formatPrice, cn } from "@/lib/format";
import type { SearchResponse } from "@/app/api/search/route";

const DEBOUNCE_MS = 150;

/**
 * Instant search. Opens as a full-width top panel (via useUi().searchOpen),
 * queries /api/search while typing and offers content-driven quick links when
 * the query is empty. Enter navigates to the full results page.
 */
export function SearchOverlay() {
  const open = useUi((s) => s.searchOpen);
  const closeSearch = useUi((s) => s.closeSearch);
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [quick, setQuick] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastActive = useRef<Element | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const trimmed = query.trim();
  const active = trimmed.length >= 2;

  // Close on navigation.
  useEffect(() => { closeSearch(); }, [pathname, closeSearch]);

  // Open/close side effects: focus, scroll lock, Escape.
  useEffect(() => {
    if (!open) return;
    lastActive.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeSearch(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("[data-result]") ?? []);
        if (!items.length) return;
        const idx = items.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        if (e.key === "ArrowDown") (idx < 0 ? items[0] : items[Math.min(idx + 1, items.length - 1)]).focus();
        else if (idx <= 0) inputRef.current?.focus();
        else items[idx - 1].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
      (lastActive.current as HTMLElement | null)?.focus?.();
    };
  }, [open, closeSearch]);

  // Quick links for the empty state – fetched once.
  useEffect(() => {
    if (!open || quick) return;
    const ctrl = new AbortController();
    fetch("/api/search?q=", { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: SearchResponse | null) => { if (d) setQuick(d); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [open, quick]);

  // Debounced live search.
  useEffect(() => {
    if (!open) return;
    if (!active) { setResults(null); setLoading(false); abortRef.current?.abort(); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as SearchResponse;
        if (!ctrl.signal.aborted) { setResults(data); setLoading(false); }
      } catch (err) {
        if ((err as Error).name !== "AbortError") { setResults({ query: trimmed, products: [], occasions: [], categories: [] }); setLoading(false); }
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [trimmed, active, open]);

  const submit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;
    router.push(`${routes.search}?q=${encodeURIComponent(trimmed)}`);
    closeSearch();
  }, [trimmed, router, closeSearch]);

  if (typeof document === "undefined" || !open) return null;

  const shown = active ? results : quick;
  const total = shown ? shown.products.length + shown.occasions.length + shown.categories.length : 0;
  const empty = active && results && total === 0 && !loading;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="presentation">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-fade-in" onClick={closeSearch} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Suche"
        className="absolute inset-x-0 top-0 max-h-[100dvh] overflow-y-auto overscroll-contain bg-ivory shadow-lift animate-fade-in sm:max-h-[88dvh] sm:rounded-b-xl"
      >
        <div className="container-x pb-8 pt-4 sm:pb-12 sm:pt-6">
          <form onSubmit={submit} role="search" className="flex items-center gap-3 border-b border-line pb-3 sm:gap-4 sm:pb-4">
            <label htmlFor="site-search" className="sr-only">Suchbegriff</label>
            <Search className="size-5 shrink-0 text-forest sm:size-6" strokeWidth={1.6} aria-hidden />
            <input
              ref={inputRef}
              id="site-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Wonach suchst du?"
              autoComplete="off"
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent font-serif text-[26px] text-ink placeholder:text-ink-soft focus:outline-none sm:text-4xl [&::-webkit-search-cancel-button]:hidden"
            />
            {loading && <Loader2 className="size-5 animate-spin text-ink-soft" aria-hidden />}
            {query && !loading && (
              <button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label="Eingabe löschen" className="rounded-full p-2 text-ink-soft transition-colors hover:bg-ivory-200 hover:text-ink">
                <X className="size-4" />
              </button>
            )}
            <button type="button" onClick={closeSearch} className="hidden h-9 items-center gap-2 rounded-md border border-line px-3 text-[12px] font-semibold text-ink-muted transition-colors hover:border-forest hover:text-forest sm:inline-flex">
              Schließen <kbd className="rounded-xs bg-ivory-200 px-1.5 py-0.5 font-sans text-[10px] tracking-wider">ESC</kbd>
            </button>
            <button type="button" onClick={closeSearch} aria-label="Suche schließen" className="rounded-full p-2 text-ink transition-colors hover:bg-ivory-200 sm:hidden">
              <X className="size-5" />
            </button>
          </form>

          <div className="mt-6 sm:mt-8" aria-live="polite">
            {!active && quick && <QuickLinks data={quick} onSuggest={(s) => { setQuery(s); inputRef.current?.focus(); }} />}
            {!active && !quick && <p className="text-[14px] text-ink-soft">Tipp: Suche nach Blumen, Farben oder Anlässen – zum Beispiel „Rosen“ oder „Mama“.</p>}

            {active && results && total > 0 && <Results data={results} query={trimmed} />}
            {empty && (
              <div className="max-w-lg">
                <p className="font-serif text-2xl text-ink">Keine Treffer für „{trimmed}“.</p>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">Versuch es mit einer Blume, einer Farbe oder einem Anlass. Oder schau dich in allen Sträußen um.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(quick?.suggestions ?? []).map((s) => <SuggestionChip key={s} label={s} onClick={() => setQuery(s)} />)}
                </div>
                <Link href={routes.shop} data-result className="group mt-5 inline-flex items-center gap-2 text-sm font-semibold text-forest">
                  Alle Blumen ansehen <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </div>
            )}
            {active && !results && loading && <p className="text-[14px] text-ink-soft">Suche läuft …</p>}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow mb-4">{children}</p>;
}

function SuggestionChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} data-result className="inline-flex h-9 items-center rounded-full border border-line bg-white px-4 text-[13px] text-ink transition-colors hover:border-forest hover:text-forest">
      {label}
    </button>
  );
}

function ProductHit({ p, compact }: { p: SearchResponse["products"][number]; compact?: boolean }) {
  return (
    <Link href={routes.product(p.slug)} data-result className="group flex items-center gap-4 rounded-md p-1.5 transition-colors hover:bg-ivory-100">
      <div className={cn("relative shrink-0 overflow-hidden rounded-sm bg-ivory-200", compact ? "size-14" : "h-20 w-16")}>
        <Image src={p.image.src} alt="" fill sizes="96px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="min-w-0">
        <p className="font-serif text-[19px] leading-tight text-ink group-hover:text-forest">{p.name}</p>
        <p className="line-clamp-1 text-[13px] text-ink-muted">{p.tagline}</p>
        <p className="mt-0.5 text-[13px] tabular-nums text-ink"><span className="text-ink-muted">ab </span>{formatPrice(p.basePrice)}</p>
      </div>
    </Link>
  );
}

function QuickLinks({ data, onSuggest }: { data: SearchResponse; onSuggest: (s: string) => void }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr_1fr]">
      <div>
        <SectionTitle>Beliebte Anlässe</SectionTitle>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
          {data.occasions.map((o) => (
            <li key={o.slug}>
              <Link href={routes.occasion(o.slug)} data-result className="group block">
                <div className="relative aspect-[5/4] overflow-hidden rounded-md bg-ivory-200">
                  <Image src={o.image} alt="" fill sizes="200px" className="object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                </div>
                <p className="mt-2 text-[13.5px] font-semibold text-ink group-hover:text-forest">{o.name}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-8">
        <div>
          <SectionTitle>Schnell zu</SectionTitle>
          <ul className="flex flex-col gap-1">
            <li>
              <Link href={`${routes.shop}?sameday=1`} data-result className="group flex items-center gap-3 rounded-md py-2 text-[15px] text-ink hover:text-forest">
                <Clock className="size-4 text-forest" strokeWidth={1.7} aria-hidden /> Heute lieferbar
              </Link>
            </li>
            <li>
              <Link href={routes.category("bestseller")} data-result className="group flex items-center gap-3 rounded-md py-2 text-[15px] text-ink hover:text-forest">
                <Sparkles className="size-4 text-forest" strokeWidth={1.7} aria-hidden /> Bestseller
              </Link>
            </li>
            <li>
              <Link href={`${routes.shop}?sort=new`} data-result className="group flex items-center gap-3 rounded-md py-2 text-[15px] text-ink hover:text-forest">
                <ArrowRight className="size-4 text-forest" strokeWidth={1.7} aria-hidden /> Neu im Sortiment
              </Link>
            </li>
          </ul>
        </div>
        {data.suggestions && data.suggestions.length > 0 && (
          <div>
            <SectionTitle>Häufig gesucht</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {data.suggestions.map((s) => <SuggestionChip key={s} label={s} onClick={() => onSuggest(s)} />)}
            </div>
          </div>
        )}
      </div>
      <div>
        <SectionTitle>Bestseller</SectionTitle>
        <ul className="flex flex-col gap-1">
          {data.products.map((p) => <li key={p.slug}><ProductHit p={p} compact /></li>)}
        </ul>
      </div>
    </div>
  );
}

function Results({ data, query }: { data: SearchResponse; query: string }) {
  const hasSide = data.occasions.length > 0 || data.categories.length > 0;
  return (
    <div className={cn("grid gap-10", hasSide && "lg:grid-cols-[1.6fr_1fr]")}>
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <SectionTitle>Sträuße</SectionTitle>
          <Link href={`${routes.search}?q=${encodeURIComponent(query)}`} data-result className="group mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest">
            Alle Ergebnisse <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
        {data.products.length > 0 ? (
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {data.products.map((p) => <li key={p.slug}><ProductHit p={p} /></li>)}
          </ul>
        ) : (
          <p className="text-[14px] text-ink-muted">Kein Strauß passt direkt zu „{query}“ – vielleicht ein Anlass oder eine Kollektion?</p>
        )}
      </div>
      {hasSide && (
        <div className="flex flex-col gap-8">
          {data.occasions.length > 0 && (
            <div>
              <SectionTitle>Anlässe</SectionTitle>
              <ul className="flex flex-col gap-1">
                {data.occasions.map((o) => (
                  <li key={o.slug}>
                    <Link href={routes.occasion(o.slug)} data-result className="group flex items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-ivory-100">
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-full bg-ivory-200">
                        <Image src={o.image} alt="" fill sizes="48px" className="object-cover" />
                      </span>
                      <span className="text-[15px] text-ink group-hover:text-forest">{o.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.categories.length > 0 && (
            <div>
              <SectionTitle>Kollektionen</SectionTitle>
              <ul className="flex flex-wrap gap-2">
                {data.categories.map((c) => (
                  <li key={c.slug}>
                    <Link href={routes.category(c.slug)} data-result className="inline-flex h-9 items-center rounded-full border border-line bg-white px-4 text-[13px] text-ink transition-colors hover:border-forest hover:text-forest">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
