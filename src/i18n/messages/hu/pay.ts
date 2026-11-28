import type { PartialMessages } from "@/i18n/messages";

/** hu – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "A fizetési mező betöltése …",
    loadFailed: "A fizetési mezőt nem sikerült betölteni. Kérjük, töltsd újra az oldalt, próbálj ki egy másik böngészőt, vagy válassz másik fizetési módot. Semmit nem terheltünk.",
    redirectHint: "A „Megvásárlom” után a fizetést a(z) {method} oldalán erősíted meg.",
    walletHint: "A „Megvásárlom” után a fizetést {method} segítségével erősíted meg.",
    amountChanged: "A végösszeg most {total} (pl. a szállítási díj vagy egy kupon miatt). Kérjük, ellenőrizd, és koppints újra a gombra – semmit nem terheltünk.",
    failed: "A fizetés nem sikerült: {reason} A(z) {orderId} rendelésed el van mentve, de még nincs kifizetve – próbáld újra, vagy válassz másik fizetési módot.",
    retry: "Kérjük, add meg újra a fizetési adataidat, és koppints még egyszer a gombra.",
  },
  express: {
    title: "Expressz vásárlás",
    /** Divider between the checkout button and the wallet buttons in the cart. */
    intro: "Rendelj közvetlenül Apple Pay, Google Pay vagy Link segítségével – a szállítási cím és az elérhetőségek a pénztárcádból érkeznek.",
    postalCode: "A címzett irányítószáma",
    date: "Szállítási nap",
    window: "Időablak",
    choose: "Kérjük, válassz",
    needPostalCode: "Kérjük, először add meg a címzett irányítószámát.",
    needSlot: "Kérjük, először válassz szállítási napot és időablakot.",
    noDays: "Ehhez az irányítószámhoz jelenleg nincs szabad szállítási nap.",
    errors: {
      zone: "Erre az irányítószámra sajnos nem szállítunk. Kérjük, válassz címet a szállítási területünkön.",
      date: "A választott szállítási nap ehhez a címhez nem elérhető. Kérjük, válassz másik napot.",
      window: "A választott időablak ehhez a címhez nem elérhető. Kérjük, válassz másikat.",
      minOrder: "Erre a szállítási területre minimális rendelési érték vonatkozik – kérjük, lépj tovább a pénztárhoz.",
      items: "Egy termék jelenleg nem elérhető. Kérjük, ellenőrizd a kosaradat.",
      coupon: "A kupon nem érvényes. Kérjük, távolítsd el, vagy lépj tovább a pénztárhoz.",
      address: "Kérjük, válassz a pénztárcádban teljes szállítási címet házszámmal, egy e-mail-címet és egy telefonszámot.",
      amountChanged: "Az összeg épp megváltozott. Kérjük, indítsd újra az expressz vásárlást – semmit nem terheltünk.",
      failed: "Az expressz fizetés nem sikerült. Semmit nem terheltünk – próbáld újra, vagy lépj tovább a pénztárhoz.",
      connection: "Nincs kapcsolat. Kérjük, ellenőrizd az internetkapcsolatodat, és próbáld újra.",
    },
    goods: "Virágok és extrák",
    shipping: "Szállítás: {date}",
    shippingWindow: "Szállítás: {date}, {window}",
    legal: "A(z) {wallet} használatával fizetési kötelezettséggel rendelsz · {terms} · {withdrawal}",
    terms: "ÁSZF",
    withdrawal: "Elállás",
    withdrawalNote: "Friss vágott virágok esetén nincs elállási jog.",
  },
};

export default pay;
