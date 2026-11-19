import type { PartialMessages } from "@/i18n/messages";

/** ar – common (translated from src/i18n/messages/de/common.ts). */
const common: NonNullable<PartialMessages["common"]> = {
  brandClaim: "زهور تقول أكثر.",
  priceFrom: "ابتداءً من {price}",
  languageLabel: "اللغة",
  languageHint: "هذه الصفحة متوفرة أيضًا باللغة: {language}.",
  languageHintAction: "الانتقال إلى النسخة: {language}",
  close: "إغلاق",
  germanVersionApplies: "هذا النص متوفر باللغة الألمانية فقط، والنسخة الألمانية هي المعتمدة.",
};

export default common;
