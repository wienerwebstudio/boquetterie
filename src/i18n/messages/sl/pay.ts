import type { PartialMessages } from "@/i18n/messages";

/** sl – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "Plačilno polje se nalaga …",
    loadFailed: "Plačilnega polja ni bilo mogoče naložiti. Znova naložite stran, poskusite z drugim brskalnikom ali izberite drug način plačila. Nič ni bilo bremenjeno.",
    redirectHint: "Po »Kupi zdaj« plačilo potrdite pri {method}.",
    walletHint: "Po »Kupi zdaj« plačilo potrdite z {method}.",
    amountChanged: "Skupni znesek je zdaj {total} (npr. zaradi stroškov dostave ali kupona). Preverite ga in znova tapnite gumb – nič ni bilo bremenjeno.",
    failed: "Plačilo ni uspelo: {reason} Vaše naročilo {orderId} je shranjeno, vendar še ni plačano – poskusite takoj znova ali izberite drug način plačila.",
    retry: "Znova vnesite plačilne podatke in ponovno tapnite gumb.",
  },
  express: {
    title: "Hitri nakup",
    intro: "Naročite neposredno z Apple Pay, Google Pay ali Link – naslov dostave in kontaktni podatki pridejo iz vaše denarnice.",
    postalCode: "Poštna številka prejemnika",
    date: "Dan dostave",
    window: "Časovno okno",
    choose: "Izberite",
    needPostalCode: "Najprej vnesite poštno številko prejemnika.",
    needSlot: "Najprej izberite dan dostave in časovno okno.",
    noDays: "Za to poštno številko trenutno ni prostega dneva dostave.",
    errors: {
      zone: "Na to poštno številko žal ne dostavljamo. Izberite naslov na našem območju dostave.",
      date: "Izbrani dan dostave za ta naslov ni na voljo. Izberite drug dan.",
      window: "Izbrano časovno okno za ta naslov ni na voljo. Izberite drugo.",
      minOrder: "Za to območje dostave velja najnižja vrednost naročila – nadaljujte na blagajno.",
      items: "Eden od izdelkov trenutno ni na voljo. Preverite svojo košarico.",
      coupon: "Kupon ni veljaven. Odstranite ga ali nadaljujte na blagajno.",
      address: "V denarnici izberite popoln naslov dostave s hišno številko, e-poštni naslov in telefonsko številko.",
      amountChanged: "Znesek se je pravkar spremenil. Hitri nakup začnite znova – nič ni bilo bremenjeno.",
      failed: "Hitro plačilo ni uspelo. Nič ni bilo bremenjeno – poskusite znova ali nadaljujte na blagajno.",
      connection: "Ni povezave. Preverite internetno povezavo in poskusite znova.",
    },
    goods: "Cvetje in dodatki",
    shipping: "Dostava dne {date}",
    shippingWindow: "Dostava dne {date}, {window}",
    legal: "Z {wallet} oddate naročilo, ki vas zavezuje k plačilu · {terms} · {withdrawal}",
    terms: "Splošni pogoji",
    withdrawal: "Odstop od pogodbe",
    withdrawalNote: "Za sveže rezano cvetje pravica do odstopa ne obstaja.",
  },
};

export default pay;
