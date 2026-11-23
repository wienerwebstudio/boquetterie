import type { PartialMessages } from "@/i18n/messages";

/** bg – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Навигационна пътека",
    home: "Начало",
  },
  optional: "(по избор)",
  /** Accessible name of the country-code select in phone fields. */
  phoneCountry: "Код на държавата",
  priceFromPrefix: "от",
  starRating: "{value} от 5 звезди",
};

export default ui;
