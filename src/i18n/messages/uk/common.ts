import type { PartialMessages } from "@/i18n/messages";

/** uk – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Квіти, що кажуть більше.",
  priceFrom: "від {price}",
  languageLabel: "Мова",
  languageHint: "Ця сторінка також доступна мовою: {language}.",
  languageHintAction: "Перейти до версії: {language}",
  close: "Закрити",
  germanVersionApplies: "Цей текст доступний лише німецькою мовою. Чинною є німецька версія.",
  reviewTranslatedFrom: "Перекладено з мови: {language}",
  reviewOriginalLanguage: "Мова оригіналу: {language}",
  reviewShowOriginal: "Показати оригінал",
};

export default common;
