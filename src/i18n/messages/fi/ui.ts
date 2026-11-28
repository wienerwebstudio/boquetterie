import type { PartialMessages } from "@/i18n/messages";

/** fi – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Murupolku",
    home: "Etusivu",
  },
  optional: "(valinnainen)",
  phoneCountry: "Maatunnus",
  priceFromPrefix: "alk.",
  starRating: "{value}/5 tähteä",
};

export default ui;
