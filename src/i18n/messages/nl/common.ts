import type { PartialMessages } from "@/i18n/messages";

/** nl – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Bloemen die meer zeggen.",
  priceFrom: "vanaf {price}",
  languageLabel: "Taal",
  languageHint: "Deze pagina is ook beschikbaar in het {language}.",
  languageHintAction: "Naar de {language} versie",
  close: "Sluiten",
  germanVersionApplies: "Deze tekst is alleen in het Duits beschikbaar. De Duitse versie is van toepassing.",
  reviewTranslatedFrom: "Vertaald uit: {language}",
  reviewOriginalLanguage: "Oorspronkelijke taal: {language}",
  reviewShowOriginal: "Origineel tonen",
};

export default common;
