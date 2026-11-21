import type { PartialMessages } from "@/i18n/messages";

/** bks – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "Polje za plaćanje se učitava …",
    loadFailed: "Polje za plaćanje nije moguće učitati. Molimo ponovo učitajte stranicu, probajte drugi preglednik ili odaberite drugi način plaćanja. Ništa nije naplaćeno.",
    redirectHint: "Nakon „Kupi sada“ potvrđujete plaćanje kod {method}.",
    walletHint: "Nakon „Kupi sada“ potvrđujete plaćanje putem {method}.",
    amountChanged: "Ukupni iznos sada je {total} (npr. zbog naknade za dostavu ili vaučera). Molimo provjerite ga i ponovo dodirnite dugme – ništa nije naplaćeno.",
    failed: "Plaćanje nije uspjelo: {reason} Vaša narudžba {orderId} je sačuvana, ali još nije plaćena – pokušajte odmah ponovo ili odaberite drugi način plaćanja.",
    retry: "Molimo ponovo unesite podatke za plaćanje i još jednom dodirnite dugme.",
  },
  express: {
    title: "Brza kupovina",
    /** Divider between the checkout button and the wallet buttons in the cart. */
    intro: "Naručite direktno putem Apple Pay, Google Pay ili Link – adresa dostave i kontakt podaci dolaze iz vašeg novčanika.",
    postalCode: "Poštanski broj primaoca",
    date: "Dan dostave",
    window: "Vremenski okvir",
    choose: "Molimo odaberite",
    needPostalCode: "Molimo prvo unesite poštanski broj primaoca.",
    needSlot: "Molimo prvo odaberite dan dostave i vremenski okvir.",
    noDays: "Za ovaj poštanski broj trenutno nema slobodnog dana dostave.",
    errors: {
      zone: "Nažalost ne dostavljamo na ovaj poštanski broj. Molimo odaberite adresu u našem području dostave.",
      date: "Odabrani dan dostave nije dostupan za ovu adresu. Molimo odaberite drugi dan.",
      window: "Odabrani vremenski okvir nije dostupan za ovu adresu. Molimo odaberite drugi.",
      minOrder: "Za ovo područje dostave važi minimalna vrijednost narudžbe – molimo idite na blagajnu.",
      items: "Jedan artikal trenutno nije dostupan. Molimo provjerite korpu.",
      coupon: "Vaučer nije važeći. Molimo uklonite ga ili idite na blagajnu.",
      address: "Molimo u novčaniku odaberite potpunu adresu dostave s kućnim brojem, e-mail adresu i broj telefona.",
      amountChanged: "Iznos se upravo promijenio. Molimo ponovo pokrenite brzu kupovinu – ništa nije naplaćeno.",
      failed: "Brzo plaćanje nije uspjelo. Ništa nije naplaćeno – pokušajte ponovo ili idite na blagajnu.",
      connection: "Nema veze. Molimo provjerite internetsku vezu i pokušajte ponovo.",
    },
    goods: "Cvijeće i dodaci",
    shipping: "Dostava {date}",
    shippingWindow: "Dostava {date}, {window}",
    legal: "Putem {wallet} dajete narudžbu s obavezom plaćanja · {terms} · {withdrawal}",
    terms: "Uslovi",
    withdrawal: "Odustanak",
    withdrawalNote: "Za svježe rezano cvijeće ne postoji pravo na odustanak.",
  },
};

export default pay;
