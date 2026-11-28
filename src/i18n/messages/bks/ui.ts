import type { PartialMessages } from "@/i18n/messages";

/** bks – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Putanja navigacije",
    home: "Početna",
  },
  optional: "(neobavezno)",
  /** Accessible name of the country-code select in phone fields. */
  phoneCountry: "Pozivni broj države",
  priceFromPrefix: "od",
  starRating: "{value} od 5 zvjezdica",
};

export default ui;
