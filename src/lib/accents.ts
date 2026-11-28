/**
 * Rotating colour chips (icon circles, numbered steps) – blush, peach, sage, lavender.
 * Text colours on these fields meet WCAG AA. Full class names so Tailwind picks them up.
 */
export const ACCENT_CHIPS = [
  "bg-blush text-rose-700",
  "bg-peach text-peach-700",
  "bg-sage text-sage-700",
  "bg-lavender text-lavender-700",
] as const;

export const accentChip = (i: number) => ACCENT_CHIPS[i % ACCENT_CHIPS.length];
