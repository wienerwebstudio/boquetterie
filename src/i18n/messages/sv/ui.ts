import type { PartialMessages } from "@/i18n/messages";

/** sv – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Brödsmulor",
    home: "Start",
  },
  optional: "(valfritt)",
  phoneCountry: "Landsnummer",
  priceFromPrefix: "från",
  starRating: "{value} av 5 stjärnor",
};

export default ui;
