import type { PartialMessages } from "@/i18n/messages";

/** sk – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "Načítava sa platobné pole …",
    loadFailed: "Platobné pole sa nepodarilo načítať. Obnovte, prosím, stránku, skúste iný prehliadač alebo zvoľte iný spôsob platby. Nič nebolo stiahnuté.",
    redirectHint: "Po kliknutí na „Kúpiť teraz“ potvrdíte platbu v {method}.",
    walletHint: "Po kliknutí na „Kúpiť teraz“ potvrdíte platbu cez {method}.",
    amountChanged: "Celková suma je teraz {total} (napr. kvôli poplatku za doručenie alebo poukážke). Skontrolujte ju, prosím, a kliknite na tlačidlo ešte raz – nič nebolo stiahnuté.",
    failed: "Platba sa nepodarila: {reason} Vaša objednávka {orderId} je uložená, ale ešte nie je zaplatená – skúste to znova alebo zvoľte iný spôsob platby.",
    retry: "Zadajte, prosím, platobné údaje znova a ešte raz kliknite na tlačidlo.",
  },
  express: {
    title: "Expresný nákup",
    /** Divider between the checkout button and the wallet buttons in the cart. */
    or: "alebo",
    intro: "Objednajte priamo cez Apple Pay, Google Pay alebo Link – adresa doručenia a kontaktné údaje sa prevezmú z vašej peňaženky.",
    postalCode: "PSČ príjemcu",
    date: "Deň doručenia",
    window: "Časové okno",
    choose: "Vyberte, prosím",
    needPostalCode: "Najprv, prosím, zadajte PSČ príjemcu.",
    needSlot: "Najprv, prosím, vyberte deň doručenia a časové okno.",
    noDays: "Pre toto PSČ momentálne nie je voľný žiadny deň doručenia.",
    errors: {
      zone: "Na toto PSČ, žiaľ, nedoručujeme. Vyberte, prosím, adresu v našej oblasti doručenia.",
      date: "Zvolený deň doručenia nie je pre túto adresu dostupný. Vyberte, prosím, iný deň.",
      window: "Zvolené časové okno nie je pre túto adresu dostupné. Vyberte, prosím, iné.",
      minOrder: "Pre túto oblasť doručenia platí minimálna hodnota objednávky – prejdite, prosím, do pokladne.",
      items: "Jeden z produktov momentálne nie je dostupný. Skontrolujte, prosím, košík.",
      coupon: "Poukážka nie je platná. Odstráňte ju, prosím, alebo prejdite do pokladne.",
      address: "Vyberte, prosím, vo svojej peňaženke úplnú adresu doručenia s číslom domu, e-mailovú adresu a telefónne číslo.",
      amountChanged: "Suma sa práve zmenila. Spustite, prosím, expresný nákup znova – nič nebolo stiahnuté.",
      failed: "Expresná platba sa nepodarila. Nič nebolo stiahnuté – skúste to znova alebo prejdite do pokladne.",
      connection: "Žiadne pripojenie. Skontrolujte, prosím, internetové pripojenie a skúste to znova.",
    },
    goods: "Kvety a doplnky",
    shipping: "Doručenie {date}",
    shippingWindow: "Doručenie {date}, {window}",
    legal: "Cez Apple Pay, Google Pay alebo Link zadávate objednávku s povinnosťou platby. Platia naše {terms} a {withdrawal}. Pri čerstvých rezaných kvetoch neexistuje právo na odstúpenie.",
    terms: "VOP",
    withdrawal: "poučenie o odstúpení od zmluvy",
  },
};

export default pay;
