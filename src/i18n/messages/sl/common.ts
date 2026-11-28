import type { PartialMessages } from "@/i18n/messages";

/** sl – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Cvetje, ki pove več.",
  priceFrom: "od {price}",
  languageLabel: "Jezik",
  languageHint: "Ta stran je na voljo tudi v jeziku: {language}.",
  languageHintAction: "Na različico v jeziku: {language}",
  close: "Zapri",
  germanVersionApplies: "To besedilo je na voljo samo v nemščini. Velja nemška različica.",
  reviewTranslatedFrom: "Prevedeno iz jezika: {language}",
  reviewOriginalLanguage: "Izvirni jezik: {language}",
  reviewShowOriginal: "Prikaži izvirnik",
};

export default common;
