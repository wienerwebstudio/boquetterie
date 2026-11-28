import type { PartialMessages } from "@/i18n/messages";

/** cs – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "Načítá se platební pole …",
    loadFailed: "Platební pole se nepodařilo načíst. Obnovte prosím stránku, zkuste jiný prohlížeč nebo zvolte jiný způsob platby. Nic nebylo strženo.",
    redirectHint: "Po kliknutí na „Koupit nyní“ potvrdíte platbu u {method}.",
    walletHint: "Po kliknutí na „Koupit nyní“ potvrdíte platbu přes {method}.",
    amountChanged: "Celková částka je nyní {total} (např. kvůli poplatku za doručení nebo poukázce). Zkontrolujte ji prosím a klikněte na tlačítko ještě jednou – nic nebylo strženo.",
    failed: "Platba se nezdařila: {reason} Vaše objednávka {orderId} je uložena, ale zatím není zaplacena – zkuste to hned znovu nebo zvolte jiný způsob platby.",
    retry: "Zadejte prosím platební údaje znovu a klikněte ještě jednou na tlačítko.",
  },
  express: {
    title: "Expresní nákup",
    intro: "Objednejte přímo přes Apple Pay, Google Pay nebo Link – doručovací adresa a kontaktní údaje se převezmou z vaší peněženky.",
    postalCode: "PSČ příjemce",
    date: "Den doručení",
    window: "Časové okno",
    choose: "Vyberte prosím",
    needPostalCode: "Nejprve prosím zadejte PSČ příjemce.",
    needSlot: "Nejprve prosím vyberte den doručení a časové okno.",
    noDays: "Pro toto PSČ teď není volný žádný den doručení.",
    errors: {
      zone: "Na toto PSČ bohužel nedoručujeme. Vyberte prosím adresu v naší oblasti doručení.",
      date: "Zvolený den doručení není pro tuto adresu k dispozici. Vyberte prosím jiný den.",
      window: "Zvolené časové okno není pro tuto adresu k dispozici. Vyberte prosím jiné.",
      minOrder: "Pro tuto oblast doručení platí minimální hodnota objednávky – přejděte prosím do pokladny.",
      items: "Jedna z položek teď není k dispozici. Zkontrolujte prosím košík.",
      coupon: "Poukázka není platná. Odstraňte ji prosím nebo přejděte do pokladny.",
      address: "Vyberte prosím ve své peněžence úplnou doručovací adresu s číslem domu, e-mailovou adresu a telefonní číslo.",
      amountChanged: "Částka se právě změnila. Spusťte prosím expresní nákup znovu – nic nebylo strženo.",
      failed: "Expresní platba se nezdařila. Nic nebylo strženo – zkuste to znovu nebo přejděte do pokladny.",
      connection: "Žádné připojení. Zkontrolujte prosím připojení k internetu a zkuste to znovu.",
    },
    goods: "Květiny a doplňky",
    shipping: "Doručení {date}",
    shippingWindow: "Doručení {date}, {window}",
    legal: "Přes {wallet} objednáváte s povinností platby · {terms} · {withdrawal}",
    terms: "Obchodní podmínky",
    withdrawal: "Odstoupení",
    withdrawalNote: "U čerstvých řezaných květin nelze od smlouvy odstoupit.",
  },
};

export default pay;
