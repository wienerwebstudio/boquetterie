import type { PartialMessages } from "@/i18n/messages";

/** ro – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Navigare",
    home: "Acasă",
  },
  optional: "(opțional)",
  priceFromPrefix: "de la",
  starRating: "{value} din 5 stele",
};

export default ui;
