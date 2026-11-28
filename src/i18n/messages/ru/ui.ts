import type { PartialMessages } from "@/i18n/messages";

/** ru – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Навигационная цепочка",
    home: "Главная",
  },
  optional: "(необязательно)",
  /** Accessible name of the country-code select in phone fields. */
  phoneCountry: "Код страны",
  priceFromPrefix: "от",
  starRating: "{value} из 5 звёзд",
};

export default ui;
