import type { PartialMessages } from "@/i18n/messages";

/** cs – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Květiny, které řeknou víc.",
  priceFrom: "od {price}",
  languageLabel: "Jazyk",
  languageHint: "Tato stránka je k dispozici také v jazyce: {language}.",
  languageHintAction: "Přejít na verzi: {language}",
  close: "Zavřít",
  germanVersionApplies: "Tento text je k dispozici pouze v němčině. Platí německé znění.",
  reviewTranslatedFrom: "Přeloženo z jazyka: {language}",
  reviewOriginalLanguage: "Původní jazyk: {language}",
  reviewShowOriginal: "Zobrazit originál",
};

export default common;
