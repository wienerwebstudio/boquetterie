import type { PartialMessages } from "@/i18n/messages";

/** sk – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Navigačná cesta",
    home: "Úvod",
  },
  optional: "(nepovinné)",
  /** Accessible name of the country-code select in phone fields. */
  phoneCountry: "Predvoľba krajiny",
  priceFromPrefix: "od",
  starRating: "{value} z 5 hviezdičiek",
};

export default ui;
