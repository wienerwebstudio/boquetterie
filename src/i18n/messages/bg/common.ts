import type { PartialMessages } from "@/i18n/messages";

/** bg – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Цветя, които казват повече.",
  priceFrom: "от {price}",
  languageLabel: "Език",
  languageHint: "Тази страница е достъпна и на {language}.",
  languageHintAction: "Към версията на {language}",
  close: "Затвори",
  germanVersionApplies: "Този текст е достъпен само на немски език. Валидна е немската версия.",
};

export default common;
