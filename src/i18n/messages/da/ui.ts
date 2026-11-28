import type { PartialMessages } from "@/i18n/messages";

/** da – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Brødkrummer",
    home: "Forside",
  },
  optional: "(valgfrit)",
  phoneCountry: "Landekode",
  priceFromPrefix: "fra",
  starRating: "{value} ud af 5 stjerner",
};

export default ui;
