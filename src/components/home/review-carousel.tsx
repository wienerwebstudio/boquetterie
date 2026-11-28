"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";

/** Scroll position of a horizontal scroller, independent of the writing direction. */
function edges(el: HTMLElement) {
  // In RTL scrollLeft runs from 0 to negative values (spec behaviour in all current browsers).
  const pos = Math.abs(el.scrollLeft);
  const max = el.scrollWidth - el.clientWidth;
  return { atStart: pos <= 2, atEnd: pos >= max - 2 };
}

/**
 * One horizontal, scroll-snapped row of review tiles on every screen size. From md up
 * previous/next buttons move by the tiles that fit; they are disabled at the ends and
 * mirror in RTL (the row's `direction` decides which way "next" scrolls).
 */
export function ReviewRow({ header, label, previousLabel, nextLabel, children }: { header: ReactNode; label: string; previousLabel: string; nextLabel: string; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const [state, setState] = useState({ atStart: true, atEnd: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const next = edges(el);
    setState((s) => (s.atStart === next.atStart && s.atEnd === next.atEnd ? s : next));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const tile = first.offsetWidth + gap;
    const step = Math.max(1, Math.floor((el.clientWidth + gap) / tile)) * tile;
    const rtl = getComputedStyle(el).direction === "rtl";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * step * (rtl ? -1 : 1), behavior: reduce ? "auto" : "smooth" });
  };

  const button = "grid size-11 place-items-center rounded-full border border-line bg-white text-ink shadow-soft transition-colors hover:border-forest hover:text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink";

  return (
    <div>
      <div className="mb-10 flex items-end justify-between gap-6 sm:mb-14">
        <div className="min-w-0">{header}</div>
        <div className="hidden shrink-0 gap-2 md:flex">
          <button type="button" onClick={() => go(-1)} disabled={state.atStart} aria-label={previousLabel} className={button} data-review-prev>
            <ChevronLeft className="size-5 rtl:-scale-x-100" strokeWidth={1.6} aria-hidden />
          </button>
          <button type="button" onClick={() => go(1)} disabled={state.atEnd} aria-label={nextLabel} className={button} data-review-next>
            <ChevronRight className="size-5 rtl:-scale-x-100" strokeWidth={1.6} aria-hidden />
          </button>
        </div>
      </div>
      <ul
        ref={ref}
        tabIndex={0}
        aria-label={label}
        data-review-row
        className="-mx-5 -mt-2 flex snap-x snap-mandatory scroll-ps-5 gap-4 overflow-x-auto px-5 pb-3 pt-2 scrollbar-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest sm:-mx-8 sm:scroll-ps-8 sm:px-8 md:mx-0 md:scroll-ps-0 md:gap-5 md:px-0"
      >
        {children}
      </ul>
    </div>
  );
}

/**
 * The review text inside a fixed-height tile: scrolls vertically on its own (keyboard
 * focusable while there is something to scroll) and fades out at the bottom while more
 * text follows. Only the y axis contains overscroll, so a sideways swipe that starts on
 * the text still moves the row (default touch-action).
 */
export function ReviewTextBox({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  // Server render assumes "scrollable" so the box is focusable before hydration.
  const [state, setState] = useState({ scrollable: true, more: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight > 1;
    const more = scrollable && el.scrollTop + el.clientHeight < el.scrollHeight - 2;
    setState((s) => (s.scrollable === scrollable && s.more === more ? s : { scrollable, more }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      tabIndex={state.scrollable ? 0 : undefined}
      data-review-text
      data-more={state.more ? "" : undefined}
      className={cn(
        "min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain rounded-sm [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
        state.more && "[mask-image:linear-gradient(to_bottom,#000_calc(100%-2.5rem),transparent)] focus-visible:[mask-image:none]",
        className,
      )}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
}
