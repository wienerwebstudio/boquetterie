import type { PartialMessages } from "@/i18n/messages";

/** fi – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Kukkia, jotka sanovat enemmän.",
  priceFrom: "alk. {price}",
  languageLabel: "Kieli",
  languageHint: "Tämä sivu on saatavilla myös kielellä {language}.",
  languageHintAction: "Siirry versioon: {language}",
  close: "Sulje",
  germanVersionApplies: "Tämä teksti on saatavilla vain saksaksi. Saksankielinen versio on voimassa.",
  reviewTranslatedFrom: "Käännetty kielestä: {language}",
  reviewOriginalLanguage: "Alkuperäinen kieli: {language}",
  reviewShowOriginal: "Näytä alkuperäinen",
};

export default common;
