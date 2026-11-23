import type { PartialMessages } from "@/i18n/messages";

/** cs – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Drobečková navigace",
    home: "Úvod",
  },
  optional: "(nepovinné)",
  phoneCountry: "Předvolba země",
  priceFromPrefix: "od",
  starRating: "{value} z 5 hvězdiček",
};

export default ui;
