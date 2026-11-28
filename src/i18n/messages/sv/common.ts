import type { PartialMessages } from "@/i18n/messages";

/** sv – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Blommor som säger mer.",
  priceFrom: "från {price}",
  languageLabel: "Språk",
  languageHint: "Den här sidan finns även på {language}.",
  languageHintAction: "Till versionen på {language}",
  close: "Stäng",
  germanVersionApplies: "Den här texten finns bara på tyska. Den tyska versionen gäller.",
  reviewTranslatedFrom: "Översatt från: {language}",
  reviewOriginalLanguage: "Originalspråk: {language}",
  reviewShowOriginal: "Visa original",
};

export default common;
