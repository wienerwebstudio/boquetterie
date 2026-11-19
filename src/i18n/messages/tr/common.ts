import type { PartialMessages } from "@/i18n/messages";

/** tr – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Daha fazlasını anlatan çiçekler.",
  priceFrom: "başlangıç fiyatı {price}",
  languageLabel: "Dil",
  languageHint: "Bu sayfa {language} dilinde de mevcut.",
  languageHintAction: "{language} sürümüne geç",
  close: "Kapat",
  germanVersionApplies: "Bu metin yalnızca Almanca olarak mevcuttur. Almanca metin geçerlidir.",
  reviewTranslatedFrom: "Şu dilden çevrildi: {language}",
  reviewOriginalLanguage: "Orijinal dil: {language}",
  reviewShowOriginal: "Orijinali göster",
};

export default common;
