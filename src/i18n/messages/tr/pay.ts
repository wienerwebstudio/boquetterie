import type { PartialMessages } from "@/i18n/messages";

/** tr – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "Ödeme alanı yükleniyor …",
    loadFailed: "Ödeme alanı yüklenemedi. Lütfen sayfayı yeniden yükleyin, başka bir tarayıcı deneyin veya başka bir ödeme yöntemi seçin. Hiçbir ücret tahsil edilmedi.",
    redirectHint: "“Şimdi satın al”dan sonra ödemeyi {method} üzerinden onaylarsınız.",
    walletHint: "“Şimdi satın al”dan sonra ödemeyi {method} ile onaylarsınız.",
    amountChanged: "Toplam tutar artık {total} (ör. teslimat ücreti veya kupon nedeniyle). Lütfen kontrol edin ve butona tekrar dokunun – hiçbir ücret tahsil edilmedi.",
    failed: "Ödeme gerçekleşmedi: {reason} {orderId} numaralı siparişiniz kaydedildi ancak henüz ödenmedi – hemen tekrar deneyin veya başka bir ödeme yöntemi seçin.",
    retry: "Lütfen ödeme bilgilerinizi tekrar girin ve butona yeniden dokunun.",
  },
  express: {
    title: "Hızlı satın alma",
    /** Divider between the checkout button and the wallet buttons in the cart. */
    or: "veya",
    intro: "Doğrudan Apple Pay, Google Pay veya Link ile sipariş verin – teslimat adresi ve iletişim bilgileri cüzdanınızdan gelir.",
    postalCode: "Alıcının posta kodu",
    date: "Teslimat günü",
    window: "Zaman aralığı",
    choose: "Lütfen seçin",
    needPostalCode: "Lütfen önce alıcının posta kodunu girin.",
    needSlot: "Lütfen önce teslimat günü ve zaman aralığı seçin.",
    noDays: "Bu posta kodu için şu anda uygun teslimat günü yok.",
    errors: {
      zone: "Maalesef bu posta koduna teslimat yapmıyoruz. Lütfen teslimat bölgemizde bir adres seçin.",
      date: "Seçilen teslimat günü bu adres için uygun değil. Lütfen başka bir gün seçin.",
      window: "Seçilen zaman aralığı bu adres için uygun değil. Lütfen başka birini seçin.",
      minOrder: "Bu teslimat bölgesi için asgari sipariş tutarı geçerlidir – lütfen ödeme sayfasına geçin.",
      items: "Bir ürün şu anda mevcut değil. Lütfen sepetinizi kontrol edin.",
      coupon: "Kupon geçerli değil. Lütfen kaldırın veya ödeme sayfasına geçin.",
      address: "Lütfen cüzdanınızda kapı numarası dahil eksiksiz bir teslimat adresi, bir e-posta adresi ve bir telefon numarası seçin.",
      amountChanged: "Tutar az önce değişti. Lütfen hızlı satın almayı yeniden başlatın – hiçbir ücret tahsil edilmedi.",
      failed: "Hızlı ödeme gerçekleşmedi. Hiçbir ücret tahsil edilmedi – tekrar deneyin veya ödeme sayfasına geçin.",
      connection: "Bağlantı yok. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.",
    },
    goods: "Çiçekler ve ekstralar",
    shipping: "{date} tarihinde teslimat",
    shippingWindow: "{date} tarihinde teslimat, {window}",
    legal: "Apple Pay, Google Pay veya Link ile ödeme yükümlülüğü doğuran bir sipariş verirsiniz. {terms} ve {withdrawal} geçerlidir. Taze kesme çiçekler için cayma hakkı yoktur.",
    terms: "Genel İşlem Koşullarımız",
    withdrawal: "Cayma Hakkı Bilgilendirmesi",
  },
};

export default pay;
