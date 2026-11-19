import type { PartialMessages } from "@/i18n/messages";

/** pl – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Kwiaty, które mówią więcej.",
  priceFrom: "od {price}",
  languageLabel: "Język",
  languageHint: "Ta strona jest dostępna także w języku: {language}.",
  languageHintAction: "Przejdź do wersji: {language}",
  close: "Zamknij",
  germanVersionApplies: "Ten tekst jest dostępny tylko po niemiecku. Obowiązuje wersja niemiecka.",
  reviewTranslatedFrom: "Przetłumaczono z języka: {language}",
  reviewOriginalLanguage: "Język oryginału: {language}",
  reviewShowOriginal: "Pokaż oryginał",
};

export default common;
