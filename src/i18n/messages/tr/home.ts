import type { PartialMessages } from "@/i18n/messages";

/** tr – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Buketler {price} başlangıç fiyatıyla",
    allOfVienna: "Viyana'nın her yerine teslimat",
    greetingCardIncluded: "Tebrik kartı dahil",
  },
  trustBarLabel: "Sözlerimiz",
  bestsellers: {
    eyebrow: "Ürünlerimiz",
    allLink: "Tüm çiçekler",
  },
  occasions: {
    eyebrow: "Özel güne göre alışveriş",
    allLink: "Tüm özel günler",
  },
  giftFinder: {
    eyebrow: "Hediye bulucu",
    title: "Bugün birini düşündünüz mü?",
    text: "Üç kısa soru – ve size uygun buketleri gösterelim.",
    stepsLabel: "Üç soru",
    stepRecipient: "Kime?",
    stepOccasion: "Özel gün",
    stepBudget: "Bütçe",
    cta: "Hediye bul",
  },
  collections: {
    eyebrow: "Koleksiyonlar",
  },
  seasonal: {
    pricePending: "Fiyat yakında",
    from: "başlangıç fiyatı",
  },
  howItWorks: {
    eyebrow: "Nasıl çalışır?",
  },
  extras: {
    eyebrow: "Ekstralar",
    allLink: "Tüm ekstralar",
    note: "Ekstralar bir buketle birlikte eklenir – ürün sayfasında veya sepette.",
  },
  gallery: {
    eyebrow: "Galeri",
  },
  subscriptionTeaser: {
    eyebrow: "Çiçek aboneliği",
    from: "Başlangıç fiyatı",
    perDelivery: "teslimat başına",
    rhythm: "Sıklık",
    imageAlt: "Çiçek aboneliğimizden mevsimlik bir buket",
  },
  reviews: {
    eyebrow: "Müşteri yorumları",
    listLabel: "Değerlendirmeler",
    quote: "“{text}”",
    verifiedPurchase: "Doğrulanmış satın alma",
    demoNote: "Örnek değerlendirmeler – gerçek değerlendirmeler yakında.",
  },
  faq: {
    eyebrow: "SSS",
    text: "Teslimat, sipariş ve çiçeklerle ilgili en sık sorulan soruların yanıtları.",
    allLink: "Tüm sorular ve yanıtlar",
  },
  newsletter: {
    eyebrow: "Bülten",
  },

  subscription: {
    title: "Çiçek aboneliği",
    metaTitle: "Çiçek aboneliği – {headline}",
    unavailable: "Çiçek aboneliği şu anda kullanılamıyor.",
    unavailableText: "Üzerinde çalışıyoruz. O zamana kadar her özel gün için taze buketleri mağazamızda bulabilirsiniz.",
    discoverFlowers: "Çiçekleri keşfedin",
    contact: "İletişim",
    audiencesLabel: "Kimler için",
    choosePlan: "Abonelik seçin",
    imageAlt: "Çiçek aboneliğinden mevsimlik bir buket",
    plansEyebrow: "Abonelik boyutları",
    plansTitle: "Size hangi abonelik uygun?",
    plansText: "Fiyatlar teslimat başınadır ve teslimat alanımız içinde teslimat dahildir. İndirimler teslimat sıklığına göre değişir.",
    howEyebrow: "Nasıl çalışır?",
    howTitle: "İlk buketinize üç adım.",
    steps: {
      plan: { title: "Abonelik seçin", text: "Small, Medium veya Large – çiçeklere ne kadar yer ayırmak istediğinize göre." },
      rhythm: { title: "Sıklığı belirleyin", text: "Haftalık, iki haftada bir veya aylık. İstediğiniz zaman ara verebilirsiniz." },
      request: { title: "Talep gönderin", text: "Tüm ayrıntılarla size geri dönüyor, teslimat yerini ve başlangıç tarihini sizinle birlikte belirliyoruz." },
    },
  },

  planner: {
    checkoutError: "Abonelik şu anda tamamlanamıyor. Lütfen daha sonra tekrar deneyin.",
    nameRequired: "Lütfen adınızı girin.",
    chooseRhythm: "Sıklık seçin",
    rhythmLabel: "Teslimat sıklığı",
    popular: "Popüler",
    perDelivery: "/ teslimat",
    discount: "%{discount} indirim",
    selected: "Seçildi",
    choosePlan: "{name} seçin",
    requestPlan: "{name} için talep gönderin",
    checkoutDoneTitle: "Teşekkürler – çiçek aboneliğiniz tamamlandı.",
    checkoutDoneText: "E-posta ile bir onay alacaksınız. Teslimat yerini ve başlangıç tarihini sizinle belirlemek için size ulaşacağız.",
    checkout: "Aboneliği tamamla",
    requestInstead: "Bunun yerine bağlayıcı olmayan bir talep gönder",
    selectionSummary: "{plan}, {frequency} – teslimat başına {price}.",
    securePayment: "Stripe üzerinden güvenli ödeme, istediğiniz zaman iptal edilebilir.",
    sendRequest: "Talep gönder",
    noObligation: "Bağlayıcı değildir – tüm ayrıntılarla size geri döneceğiz.",
    thanksTitle: "Talebiniz için teşekkürler.",
    thanksText: "{plan} aboneliği ({frequency}) için talebinizi aldık ve size e-posta ile geri döneceğiz.",
    formEyebrow: "Talep",
    formTitle: "Bize kısaca ne istediğinizi anlatın.",
    formText: "Sözleşme yok, ödeme yok – tüm ayrıntılar ve somut bir öneriyle size geri döneceğiz.",
    plan: "Abonelik",
    rhythm: "Sıklık",
    messagePlaceholder: "Çiçekler nereye gitsin? Renk tercihiniz veya istediğiniz bir gün var mı?",
    currentSelection: "Mevcut seçim: {plan}, {frequency} – teslimat başına {price}",
  },
};

export default home;
