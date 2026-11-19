import type { PartialMessages } from "@/i18n/messages";

/** pl – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Ścieżka nawigacji",
    home: "Start",
  },
  optional: "(opcjonalnie)",
  priceFromPrefix: "od",
  starRating: "{value} na 5 gwiazdek",
};

export default ui;
