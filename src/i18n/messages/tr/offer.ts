import type { PartialMessages } from "@/i18n/messages";

/** tr – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Teklifiniz",
  eyebrow: "Kişisel teklif {id}",
  title: "Size özel teklifiniz",
  intro: "Merhaba {name}, teklifiniz burada. Her şeyi rahatça kontrol edin ve güvenle online ödeyin.",
  items: "Çiçekleriniz",
  delivery: "Teslimat",
  date: "Tarih ve saat",
  place: "Teslimat yeri",
  recipient: "Alıcı",
  card: "Tebrik kartı",
  flowers: "Çiçekler",
  extras: "Ekstralar",
  deliveryFee: "Teslimat",
  free: "ücretsiz",
  validUntil: "{date} tarihine kadar geçerli",
  payTitle: "Ödeme",
  pay: "Şimdi öde · {total}",
  acceptTerms: "{terms} ve {withdrawal} metinlerini okudum.",
  acceptTermsError: "Lütfen genel işlem koşullarını onaylayın.",
  paidTitle: "Teşekkürler – ödeme yapıldı",
  paidText: "Bu teklif ödendi. Sipariş onayınızı e-posta ile aldınız.",
  viewOrder: "Siparişi görüntüle",
  expiredTitle: "Teklifin süresi doldu",
  expiredText: "Bu teklif artık geçerli değil. Bize yazın – size memnuniyetle yeni bir teklif hazırlarız.",
  cancelledTitle: "Teklif artık mevcut değil",
  cancelledText: "Bu teklif geri çekildi. Sorularınız için bize yazın.",
  cancelledPayment: "Ödeme tamamlanmadı. Tekrar deneyebilirsiniz.",
  failed: "Ödeme başlatılamadı. Lütfen tekrar deneyin.",
  byArrangement: "Anlaşmaya göre",
};

export default offer;
