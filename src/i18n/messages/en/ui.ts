import type { PartialMessages } from "@/i18n/messages";

/** en – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Breadcrumbs",
    home: "Home",
  },
  optional: "(optional)",
  /** Accessible name of the country-code select in phone fields. */
  phoneCountry: "Country code",
  priceFromPrefix: "from",
  starRating: "{value} out of 5 stars",
};

export default ui;
