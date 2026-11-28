import type { PartialMessages } from "@/i18n/messages";

/** tr – ui (translated from src/i18n/messages/de/ui.ts). */
const ui: NonNullable<PartialMessages["ui"]> = {
  breadcrumbs: {
    label: "Sayfa yolu",
    home: "Ana sayfa",
  },
  optional: "(isteğe bağlı)",
  /** Accessible name of the country-code select in phone fields. */
  phoneCountry: "Ülke kodu",
  priceFromPrefix: "başlangıç fiyatı",
  starRating: "5 üzerinden {value} yıldız",
};

export default ui;
