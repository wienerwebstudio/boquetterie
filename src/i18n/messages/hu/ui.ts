import type { PartialMessages } from "@/i18n/messages";

/** hu – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Navigációs útvonal",
    home: "Kezdőlap",
  },
  optional: "(nem kötelező)",
  /** Accessible name of the country-code select in phone fields. */
  phoneCountry: "Országhívó-szám",
  priceFromPrefix: "kezdőár",
  starRating: "{value} / 5 csillag",
};

export default ui;
