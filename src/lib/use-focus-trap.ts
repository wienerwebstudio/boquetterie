"use client";
import { useEffect, useRef, type RefObject } from "react";

/**
 * Modal behaviour shared by the drawer and the search overlay:
 * – moves focus into the dialog and returns it to the opener on close,
 * – keeps Tab / Shift+Tab inside the dialog,
 * – closes on Escape (only the top-most dialog reacts),
 * – makes the rest of the page `inert` (not focusable, not clickable, hidden from
 *   assistive tech) and locks page scrolling.
 *
 * The dialog has to be rendered in a portal directly under <body>; everything in
 * <body> outside that portal root becomes inert. Live regions (toasts, the route
 * announcer) stay untouched so announcements still get through.
 */

const TABBABLE = [
  "a[href]", "area[href]", "button:not([disabled])", 'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])", "textarea:not([disabled])", "summary", "iframe", "audio[controls]", "video[controls]",
  '[contenteditable]:not([contenteditable="false"])', "[tabindex]",
].join(",");

/** Elements a Tab press can land on, in DOM order. */
export function getTabbable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)).filter((el) => {
    if (el.tabIndex < 0 || el.closest("[inert]")) return false;
    if (el.getClientRects().length === 0 || getComputedStyle(el).visibility === "hidden") return false;
    // Of a radio group only the checked radio is a tab stop.
    if (el instanceof HTMLInputElement && el.type === "radio" && el.name && !el.checked) {
      const scope: ParentNode = el.form ?? root;
      if (scope.querySelector(`input[type="radio"][name="${CSS.escape(el.name)}"]:checked`)) return false;
    }
    return true;
  });
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "LINK", "TEMPLATE", "NOSCRIPT"]);
const inertCounts = new WeakMap<Element, number>();
const stack: symbol[] = [];
let scrollLocks = 0;
let scrollBefore = "";

/** Sets `inert` on every <body> child except the one containing `dialog`. Returns the undo function. */
function isolate(dialog: HTMLElement): () => void {
  let root: HTMLElement = dialog;
  while (root.parentElement && root.parentElement !== document.body) root = root.parentElement;
  const touched: Element[] = [];
  for (const el of Array.from(document.body.children)) {
    if (el === root || SKIP_TAGS.has(el.tagName) || el.tagName.includes("-") || el.hasAttribute("aria-live")) continue;
    const count = inertCounts.get(el) ?? 0;
    if (count === 0 && el.hasAttribute("inert")) continue; // inert for another reason – leave it alone
    el.setAttribute("inert", "");
    inertCounts.set(el, count + 1);
    touched.push(el);
  }
  return () => {
    for (const el of touched) {
      const count = (inertCounts.get(el) ?? 1) - 1;
      if (count > 0) inertCounts.set(el, count);
      else { inertCounts.delete(el); el.removeAttribute("inert"); }
    }
  };
}

function lockScroll(): () => void {
  if (scrollLocks++ === 0) {
    scrollBefore = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  return () => { if (--scrollLocks === 0) document.body.style.overflow = scrollBefore; };
}

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  { active, onEscape, initialFocus }: {
    /** The dialog is open (and rendered). */
    active: boolean;
    onEscape?: () => void;
    /** Element to focus on open. Default: `[data-autofocus]`, else the first tabbable element. */
    initialFocus?: RefObject<HTMLElement | null>;
  },
) {
  // Latest callback without re-running the effect: a new `onEscape` identity on
  // every render must not steal the focus again.
  const escapeRef = useRef(onEscape);
  useEffect(() => { escapeRef.current = onEscape; });

  useEffect(() => {
    const dialog = ref.current;
    if (!active || !dialog) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const id = Symbol("focus-trap");
    stack.push(id);
    const release = isolate(dialog);
    const unlock = lockScroll();

    const first = initialFocus?.current ?? dialog.querySelector<HTMLElement>("[data-autofocus]") ?? getTabbable(dialog)[0] ?? dialog;
    first.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === "Escape") {
        if (escapeRef.current) { e.preventDefault(); escapeRef.current(); }
        return;
      }
      if (e.key !== "Tab") return;
      const items = getTabbable(dialog);
      if (items.length === 0) { e.preventDefault(); return; }
      const head = items[0], tail = items[items.length - 1];
      const current = document.activeElement;
      if (!dialog.contains(current) || current === dialog) { e.preventDefault(); (e.shiftKey ? tail : head).focus(); }
      else if (e.shiftKey && current === head) { e.preventDefault(); tail.focus(); }
      else if (!e.shiftKey && current === tail) { e.preventDefault(); head.focus(); }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      const at = stack.indexOf(id);
      if (at >= 0) stack.splice(at, 1);
      unlock();
      release(); // before restoring focus – an inert opener cannot be focused
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [active, ref, initialFocus]);
}
