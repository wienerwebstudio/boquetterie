import type { PartialMessages } from "@/i18n/messages";

/** da – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Blomster, der siger mere.",
  priceFrom: "fra {price}",
  languageLabel: "Sprog",
  languageHint: "Denne side findes også på {language}.",
  languageHintAction: "Gå til versionen på {language}",
  close: "Luk",
  germanVersionApplies: "Denne tekst findes kun på tysk. Den tyske version er gældende.",
  reviewTranslatedFrom: "Oversat fra: {language}",
  reviewOriginalLanguage: "Originalsprog: {language}",
  reviewShowOriginal: "Vis original",
};

export default common;
