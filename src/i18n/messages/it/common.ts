import type { PartialMessages } from "@/i18n/messages";

/** it – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Fiori che dicono di più.",
  priceFrom: "da {price}",
  languageLabel: "Lingua",
  languageHint: "Questa pagina è disponibile anche in {language}.",
  languageHintAction: "Vai alla versione in {language}",
  close: "Chiudi",
  germanVersionApplies: "Questo testo è disponibile solo in tedesco. Fa fede la versione tedesca.",
};

export default common;
