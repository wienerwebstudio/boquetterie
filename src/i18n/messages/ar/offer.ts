import type { PartialMessages } from "@/i18n/messages";

/** ar – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "عرضكم",
  eyebrow: "عرض شخصي {id}",
  title: "عرضكم الشخصي",
  intro: "مرحبًا {name}، إليكم عرضكم. راجعوا كل التفاصيل بهدوء وادفعوا بأمان عبر الإنترنت.",
  items: "زهوركم",
  delivery: "التوصيل",
  date: "التاريخ والوقت",
  place: "مكان التوصيل",
  recipient: "المستلم",
  card: "بطاقة التهنئة",
  flowers: "الزهور",
  extras: "الإضافات",
  deliveryFee: "التوصيل",
  free: "مجانًا",
  validUntil: "صالح حتى {date}",
  payTitle: "الدفع",
  pay: "ادفعوا الآن · {total}",
  acceptTerms: "قرأتُ {terms} و{withdrawal}.",
  acceptTermsError: "يرجى تأكيد الشروط والأحكام العامة.",
  paidTitle: "شكرًا – تم الدفع",
  paidText: "تم دفع هذا العرض. وصلكم تأكيد الطلب عبر البريد الإلكتروني.",
  viewOrder: "عرض الطلب",
  expiredTitle: "انتهت صلاحية العرض",
  expiredText: "هذا العرض لم يعد صالحًا. راسلونا وسنعدّ لكم عرضًا جديدًا بكل سرور.",
  cancelledTitle: "العرض لم يعد متاحًا",
  cancelledText: "تم سحب هذا العرض. لأي استفسار راسلونا.",
  cancelledPayment: "لم تكتمل عملية الدفع. يمكنكم المحاولة مرة أخرى.",
  failed: "تعذّر بدء الدفع. يرجى المحاولة مرة أخرى.",
  byArrangement: "حسب الاتفاق",
  previewTitle: "معاينة – لم يُرسَل بعد",
  previewText: "هذا العرض لا يزال مسودة. هكذا سيراه العميل. يمكن الدفع فقط بعد إرساله أو نسخ رابطه.",
};

export default offer;
