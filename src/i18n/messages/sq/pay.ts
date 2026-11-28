import type { PartialMessages } from "@/i18n/messages";

/** sq – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "Fusha e pagesës po ngarkohet …",
    loadFailed: "Fusha e pagesës nuk mund të ngarkohej. Ju lutemi ringarkoni faqen, provoni një shfletues tjetër ose zgjidhni një mënyrë tjetër pagese. Nuk u tërhoq asgjë.",
    redirectHint: "Pas „Bli tani“ e konfirmoni pagesën te {method}.",
    walletHint: "Pas „Bli tani“ e konfirmoni pagesën me {method}.",
    amountChanged: "Shuma totale tani është {total} (p.sh. për shkak të tarifës së dërgesës ose kuponit). Ju lutemi kontrollojeni dhe prekni përsëri butonin – nuk u tërhoq asgjë.",
    failed: "Pagesa nuk funksionoi: {reason} Porosia juaj {orderId} është ruajtur, por ende nuk është paguar – provoni përsëri menjëherë ose zgjidhni një mënyrë tjetër pagese.",
    retry: "Ju lutemi shkruani përsëri të dhënat e pagesës dhe prekni sërish butonin.",
  },
  express: {
    title: "Blerje ekspres",
    intro: "Porositni direkt me Apple Pay, Google Pay ose Link – adresa e dërgesës dhe të dhënat e kontaktit merren nga portofoli juaj digjital.",
    postalCode: "Kodi postar i marrësit",
    date: "Dita e dërgesës",
    window: "Intervali kohor",
    choose: "Ju lutemi zgjidhni",
    needPostalCode: "Ju lutemi shkruani së pari kodin postar të marrësit.",
    needSlot: "Ju lutemi zgjidhni së pari ditën e dërgesës dhe intervalin kohor.",
    noDays: "Për këtë kod postar aktualisht nuk ka ditë të lirë dërgese.",
    errors: {
      zone: "Fatkeqësisht nuk dërgojmë në këtë kod postar. Ju lutemi zgjidhni një adresë brenda zonës sonë të dërgesave.",
      date: "Dita e zgjedhur e dërgesës nuk është e disponueshme për këtë adresë. Ju lutemi zgjidhni një ditë tjetër.",
      window: "Intervali kohor i zgjedhur nuk është i disponueshëm për këtë adresë. Ju lutemi zgjidhni një tjetër.",
      minOrder: "Për këtë zonë dërgese vlen një vlerë minimale porosie – ju lutemi vazhdoni te përfundimi i porosisë.",
      items: "Një artikull nuk është i disponueshëm për momentin. Ju lutemi kontrolloni shportën tuaj.",
      coupon: "Kuponi nuk është i vlefshëm. Ju lutemi hiqeni ose vazhdoni te përfundimi i porosisë.",
      address: "Ju lutemi zgjidhni në portofolin tuaj digjital një adresë të plotë dërgese me numër shtëpie, një adresë e-maili dhe një numër telefoni.",
      amountChanged: "Shuma sapo ndryshoi. Ju lutemi nisni përsëri blerjen ekspres – nuk u tërhoq asgjë.",
      failed: "Pagesa ekspres nuk funksionoi. Nuk u tërhoq asgjë – provoni përsëri ose vazhdoni te përfundimi i porosisë.",
      connection: "Nuk ka lidhje. Ju lutemi kontrolloni lidhjen tuaj me internetin dhe provoni përsëri.",
    },
    goods: "Lule dhe shtesa",
    shipping: "Dërgesa më {date}",
    shippingWindow: "Dërgesa më {date}, {window}",
    legal: "Me {wallet} bëni një porosi me detyrim pagese · {terms} · {withdrawal}",
    terms: "Kushtet e përgjithshme",
    withdrawal: "Tërheqja",
    withdrawalNote: "Për lule të freskëta të prera nuk ekziston e drejta e tërheqjes.",
  },
};

export default pay;
