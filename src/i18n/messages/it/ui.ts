import type { PartialMessages } from "@/i18n/messages";

/** it – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Percorso di navigazione",
    home: "Home",
  },
  optional: "(facoltativo)",
  /** Accessible name of the country-code select in phone fields. */
  phoneCountry: "Prefisso internazionale",
  priceFromPrefix: "da",
  starRating: "{value} stelle su 5",
};

export default ui;
