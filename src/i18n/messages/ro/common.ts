import type { PartialMessages } from "@/i18n/messages";

/** ro – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Flori care spun mai mult.",
  priceFrom: "de la {price}",
  languageLabel: "Limbă",
  languageHint: "Această pagină este disponibilă și în {language}.",
  languageHintAction: "Mergi la versiunea {language}",
  close: "Închide",
  germanVersionApplies: "Acest text este disponibil doar în limba germană. Se aplică versiunea în limba germană.",
  reviewTranslatedFrom: "Tradus din: {language}",
  reviewOriginalLanguage: "Limba originală: {language}",
  reviewShowOriginal: "Afișează originalul",
};

export default common;
