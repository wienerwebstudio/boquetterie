import type { PartialMessages } from "@/i18n/messages";

/** ru – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "Цветы, которые говорят больше.",
  priceFrom: "от {price}",
  languageLabel: "Язык",
  languageHint: "Эта страница есть также на языке: {language}.",
  languageHintAction: "Перейти к версии: {language}",
  close: "Закрыть",
  germanVersionApplies: "Этот текст доступен только на немецком языке. Действует немецкая редакция.",
  reviewTranslatedFrom: "Переведено с языка: {language}",
  reviewOriginalLanguage: "Язык оригинала: {language}",
  reviewShowOriginal: "Показать оригинал",
};

export default common;
