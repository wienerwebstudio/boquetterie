import type { PartialMessages } from "@/i18n/messages";

/** fr – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Des fleurs qui en disent plus.",
  priceFrom: "dès {price}",
  languageLabel: "Langue",
  languageHint: "Cette page existe aussi en {language}.",
  languageHintAction: "Voir la version en {language}",
  close: "Fermer",
  germanVersionApplies: "Ce texte n’est disponible qu’en allemand. La version allemande fait foi.",
  reviewTranslatedFrom: "Traduit de : {language}",
  reviewOriginalLanguage: "Langue d’origine : {language}",
  reviewShowOriginal: "Afficher l’original",
};

export default common;
