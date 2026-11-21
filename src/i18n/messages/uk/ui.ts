import type { PartialMessages } from "@/i18n/messages";

/** uk – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Навігаційний ланцюжок",
    home: "Головна",
  },
  optional: "(необов’язково)",
  priceFromPrefix: "від",
  starRating: "{value} з 5 зірок",
};

export default ui;
