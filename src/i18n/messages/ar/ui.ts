import type { PartialMessages } from "@/i18n/messages";

/** ar – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "مسار التنقل",
    home: "الرئيسية",
  },
  optional: "(اختياري)",
  /** Accessible name of the country-code select in phone fields. */
  phoneCountry: "رمز الدولة",
  priceFromPrefix: "ابتداءً من",
  starRating: "{value} من 5 نجوم",
};

export default ui;
