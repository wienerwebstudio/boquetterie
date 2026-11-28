import type { PartialMessages } from "@/i18n/messages";

/** no – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Blomster som sier mer.",
  priceFrom: "fra {price}",
  languageLabel: "Språk",
  languageHint: "Denne siden finnes også på {language}.",
  languageHintAction: "Gå til versjonen på {language}",
  close: "Lukk",
  germanVersionApplies: "Denne teksten finnes bare på tysk. Den tyske versjonen gjelder.",
  reviewTranslatedFrom: "Oversatt fra: {language}",
  reviewOriginalLanguage: "Originalspråk: {language}",
  reviewShowOriginal: "Vis original",
};

export default common;
