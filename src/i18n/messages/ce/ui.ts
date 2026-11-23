import type { PartialMessages } from "@/i18n/messages";

/** ce – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Навигацин некъ",
    home: "Коьрта агӀо",
  },
  optional: "(лаахь)",
  /** Accessible name of the country-code select in phone fields. */
  phoneCountry: "Пачхьалкхан код",
  priceFromPrefix: "лаххара мах",
  starRating: "5 седарчух {value}",
};

export default ui;
