import localFont from "next/font/local";

/**
 * Self-hosted variable fonts (SIL OFL, see src/fonts/LICENSE-*): no request to
 * Google at build or run time. One family per script subset – the browser only
 * downloads an extra subset (Latin Extended for Turkish/Polish/…, Cyrillic,
 * Arabic script) when a page actually contains such characters. Only the basic
 * Latin files are preloaded. No generated fallback fonts: a local fallback
 * (e.g. Arial) covers every script and would stop the browser from ever
 * reaching the subset files further down the font stack in globals.css.
 */
export const serif = localFont({
  variable: "--nf-serif",
  display: "swap",
  adjustFontFallback: false,
  src: [
    { path: "../fonts/cormorant-garamond-latin-wght-normal.woff2", weight: "300 700", style: "normal" },
    { path: "../fonts/cormorant-garamond-latin-wght-italic.woff2", weight: "300 700", style: "italic" },
  ],
});

const serifExt = localFont({
  variable: "--nf-serif-ext",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
  src: [
    { path: "../fonts/cormorant-garamond-latin-ext-wght-normal.woff2", weight: "300 700", style: "normal" },
    { path: "../fonts/cormorant-garamond-latin-ext-wght-italic.woff2", weight: "300 700", style: "italic" },
  ],
});

const serifCyr = localFont({
  variable: "--nf-serif-cyr",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
  src: [
    { path: "../fonts/cormorant-garamond-cyrillic-wght-normal.woff2", weight: "300 700", style: "normal" },
    { path: "../fonts/cormorant-garamond-cyrillic-wght-italic.woff2", weight: "300 700", style: "italic" },
  ],
});

export const sans = localFont({
  variable: "--nf-sans",
  display: "swap",
  adjustFontFallback: false,
  src: [{ path: "../fonts/manrope-latin-wght-normal.woff2", weight: "200 800", style: "normal" }],
});

const sansExt = localFont({
  variable: "--nf-sans-ext",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
  src: [{ path: "../fonts/manrope-latin-ext-wght-normal.woff2", weight: "200 800", style: "normal" }],
});

const sansCyr = localFont({
  variable: "--nf-sans-cyr",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
  src: [{ path: "../fonts/manrope-cyrillic-wght-normal.woff2", weight: "200 800", style: "normal" }],
});

/** Arabic and Persian (headlines and text). */
const arabic = localFont({
  variable: "--nf-arabic",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
  src: [{ path: "../fonts/vazirmatn-arabic-wght-normal.woff2", weight: "100 900", style: "normal" }],
});

/** All font variables for the `<html>` class. */
export const fontVariables = [serif, serifExt, serifCyr, sans, sansExt, sansCyr, arabic].map((f) => f.variable).join(" ");
