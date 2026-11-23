import type { PartialMessages } from "@/i18n/messages";

/** no – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Brødsmulesti",
    home: "Forside",
  },
  optional: "(valgfritt)",
  phoneCountry: "Landskode",
  priceFromPrefix: "fra",
  starRating: "{value} av 5 stjerner",
};

export default ui;
