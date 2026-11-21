import type { PartialMessages } from "@/i18n/messages";

/** es – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Ruta de navegación",
    home: "Inicio",
  },
  optional: "(opcional)",
  priceFromPrefix: "desde",
  starRating: "{value} de 5 estrellas",
};

export default ui;
