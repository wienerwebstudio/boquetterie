import type { PartialMessages } from "@/i18n/messages";

/** nl – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Kruimelpad",
    home: "Home",
  },
  optional: "(optioneel)",
  phoneCountry: "Landcode",
  priceFromPrefix: "vanaf",
  starRating: "{value} van 5 sterren",
};

export default ui;
