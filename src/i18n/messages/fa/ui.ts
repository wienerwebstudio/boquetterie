import type { PartialMessages } from "@/i18n/messages";

/** fa – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "مسیر صفحه",
    home: "خانه",
  },
  optional: "(اختیاری)",
  /** Accessible name of the country-code select in phone fields. */
  phoneCountry: "پیش‌شماره کشور",
  priceFromPrefix: "از",
  starRating: "{value} از 5 ستاره",
};

export default ui;
