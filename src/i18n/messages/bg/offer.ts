import type { PartialMessages } from "@/i18n/messages";

/** bg – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Вашата оферта",
  eyebrow: "Лична оферта {id}",
  title: "Вашата лична оферта",
  intro: "Здравейте, {name}! Ето вашата оферта. Проверете всичко спокойно и платете сигурно онлайн.",
  items: "Вашите цветя",
  delivery: "Доставка",
  date: "Дата и час",
  place: "Място на доставка",
  recipient: "Получател",
  card: "Поздравителна картичка",
  flowers: "Цветя",
  extras: "Допълнения",
  deliveryFee: "Доставка",
  free: "безплатно",
  validUntil: "Валидна до {date}",
  payTitle: "Плащане",
  pay: "Платете сега · {total}",
  acceptTerms: "Прочетох {terms} и {withdrawal}.",
  acceptTermsError: "Моля, потвърдете общите условия.",
  paidTitle: "Благодарим – вече е платено",
  paidText: "Тази оферта е платена. Потвърждението на поръчката получихте по имейл.",
  viewOrder: "Вижте поръчката",
  expiredTitle: "Офертата е изтекла",
  expiredText: "Тази оферта вече не е валидна. Пишете ни – с удоволствие ще ви изготвим нова.",
  cancelledTitle: "Офертата вече не е налична",
  cancelledText: "Тази оферта е оттеглена. При въпроси ни пишете.",
  cancelledPayment: "Плащането не беше завършено. Можете да опитате отново.",
  failed: "Плащането не можа да започне. Моля, опитайте отново.",
  byArrangement: "По договаряне",
  previewTitle: "Преглед – още не е изпратено",
  previewText: "Тази оферта все още е чернова. Така ще я види клиентът. Плащането е възможно едва след като бъде изпратена или линкът ѝ бъде копиран.",
};

export default offer;
