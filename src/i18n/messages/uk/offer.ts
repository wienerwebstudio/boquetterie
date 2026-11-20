import type { PartialMessages } from "@/i18n/messages";

/** uk – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Ваша пропозиція",
  eyebrow: "Персональна пропозиція {id}",
  title: "Ваша персональна пропозиція",
  intro: "Вітаємо, {name}! Ось ваша пропозиція. Спокійно все перевірте й безпечно оплатіть онлайн.",
  items: "Ваші квіти",
  delivery: "Доставка",
  date: "Дата й час",
  place: "Місце доставки",
  recipient: "Отримувач",
  card: "Листівка",
  flowers: "Квіти",
  extras: "Доповнення",
  deliveryFee: "Доставка",
  free: "безкоштовно",
  validUntil: "Дійсна до {date}",
  payTitle: "Оплата",
  pay: "Оплатити зараз · {total}",
  acceptTerms: "Я ознайомився(-лася) з {terms} та {withdrawal}.",
  acceptTermsError: "Будь ласка, підтвердьте умови продажу.",
  paidTitle: "Дякуємо – вже оплачено",
  paidText: "Цю пропозицію оплачено. Підтвердження замовлення ви отримали електронною поштою.",
  viewOrder: "Переглянути замовлення",
  expiredTitle: "Термін дії пропозиції минув",
  expiredText: "Ця пропозиція більше не дійсна. Напишіть нам – ми охоче підготуємо нову.",
  cancelledTitle: "Пропозиція більше недоступна",
  cancelledText: "Цю пропозицію відкликано. Якщо маєте запитання, напишіть нам.",
  cancelledPayment: "Оплату не завершено. Ви можете спробувати ще раз.",
  failed: "Не вдалося розпочати оплату. Будь ласка, спробуйте ще раз.",
  byArrangement: "За домовленістю",
};

export default offer;
