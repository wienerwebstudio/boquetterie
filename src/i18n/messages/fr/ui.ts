import type { PartialMessages } from "@/i18n/messages";

/** fr – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Fil d’Ariane",
    home: "Accueil",
  },
  optional: "(facultatif)",
  /** Accessible name of the country-code select in phone fields. */
  phoneCountry: "Indicatif du pays",
  priceFromPrefix: "dès",
  starRating: "{value} sur 5 étoiles",
};

export default ui;
