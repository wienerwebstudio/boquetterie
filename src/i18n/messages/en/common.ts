import type { PartialMessages } from "@/i18n/messages";

/** en – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Flowers that say more.",
  priceFrom: "from {price}",
  languageLabel: "Language",
  languageHint: "This page is also available in {language}.",
  languageHintAction: "Go to the {language} version",
  close: "Close",
  germanVersionApplies: "This text is only available in German. The German version applies.",
  reviewTranslatedFrom: "Translated from: {language}",
  reviewOriginalLanguage: "Original language: {language}",
  reviewShowOriginal: "Show original",
};

export default common;
