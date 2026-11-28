import type { PartialMessages } from "@/i18n/messages";

/** sl – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Drobtinice",
    home: "Domov",
  },
  optional: "(neobvezno)",
  phoneCountry: "Klicna koda države",
  priceFromPrefix: "od",
  starRating: "{value} od 5 zvezdic",
};

export default ui;
