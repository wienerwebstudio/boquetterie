import type { PartialMessages } from "@/i18n/messages";

/** sk – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Kvety, ktoré povedia viac.",
  priceFrom: "od {price}",
  languageLabel: "Jazyk",
  languageHint: "Táto stránka je dostupná aj v jazyku: {language}.",
  languageHintAction: "Prejsť na verziu: {language}",
  close: "Zavrieť",
  germanVersionApplies: "Tento text je dostupný len v nemčine. Platí nemecké znenie.",
};

export default common;
