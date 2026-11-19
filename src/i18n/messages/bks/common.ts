import type { PartialMessages } from "@/i18n/messages";

/** bks – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Cvijeće koje kaže više.",
  priceFrom: "od {price}",
  languageLabel: "Jezik",
  languageHint: "Ova stranica postoji i na jeziku: {language}.",
  languageHintAction: "Prikaži na jeziku: {language}",
  close: "Zatvori",
  germanVersionApplies: "Ovaj tekst je dostupan samo na njemačkom jeziku. Mjerodavna je njemačka verzija.",
};

export default common;
