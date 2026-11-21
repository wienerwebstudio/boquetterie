import type { KeyboardEvent } from "react";

/**
 * Keyboard support for custom radio groups built from `role="radio"` buttons
 * (WAI-ARIA radio group pattern). Put the handler on the `role="radiogroup"`
 * element and give every radio `tabIndex={rovingTabIndex(…)}` so the group is a
 * single tab stop.
 *
 * Arrow keys, Home and End move the focus and check the focused radio. Pass
 * `select: false` when checking has side effects (e.g. it advances a wizard):
 * the arrows then only move the focus, Space/Enter check as usual.
 */
export function onRadioGroupKeyDown(e: KeyboardEvent<HTMLElement>, { select = true }: { select?: boolean } = {}) {
  const radios = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled]):not([aria-disabled="true"])'));
  const at = radios.indexOf(document.activeElement as HTMLElement);
  if (at < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
  let next: number;
  switch (e.key) {
    case "ArrowRight": case "ArrowDown": next = (at + 1) % radios.length; break;
    case "ArrowLeft": case "ArrowUp": next = (at - 1 + radios.length) % radios.length; break;
    case "Home": next = 0; break;
    case "End": next = radios.length - 1; break;
    default: return;
  }
  e.preventDefault();
  radios[next].focus();
  if (select && next !== at) radios[next].click();
}

/** Roving tabindex: the checked radio is the tab stop – the first one while nothing is checked. */
export const rovingTabIndex = (checked: boolean, index: number, anyChecked: boolean): 0 | -1 =>
  checked || (!anyChecked && index === 0) ? 0 : -1;
