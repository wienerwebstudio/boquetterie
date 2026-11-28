import type { PartialMessages } from "@/i18n/messages";

/** da – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "Betalingsfeltet indlæses …",
    loadFailed: "Betalingsfeltet kunne ikke indlæses. Genindlæs venligst siden, prøv en anden browser, eller vælg en anden betalingsmetode. Der er ikke trukket noget.",
    redirectHint: "Efter „Køb nu“ bekræfter du betalingen hos {method}.",
    walletHint: "Efter „Køb nu“ bekræfter du betalingen med {method}.",
    amountChanged: "Det samlede beløb er nu {total} (f.eks. på grund af leveringsgebyr eller rabatkode). Kontrollér det venligst, og tryk på knappen igen – der er ikke trukket noget.",
    failed: "Betalingen lykkedes ikke: {reason} Din bestilling {orderId} er gemt, men endnu ikke betalt – prøv igen med det samme, eller vælg en anden betalingsmetode.",
    retry: "Indtast venligst dine betalingsoplysninger igen, og tryk på knappen en gang til.",
  },
  express: {
    title: "Ekspreskøb",
    intro: "Bestil direkte med Apple Pay, Google Pay eller Link – leveringsadresse og kontaktoplysninger hentes fra din wallet.",
    postalCode: "Modtagerens postnummer",
    date: "Leveringsdag",
    window: "Tidsrum",
    choose: "Vælg venligst",
    needPostalCode: "Indtast venligst først modtagerens postnummer.",
    needSlot: "Vælg venligst først leveringsdag og tidsrum.",
    noDays: "For dette postnummer er der ingen ledig leveringsdag lige nu.",
    errors: {
      zone: "Til dette postnummer leverer vi desværre ikke. Vælg venligst en adresse i vores leveringsområde.",
      date: "Den valgte leveringsdag er ikke tilgængelig for denne adresse. Vælg venligst en anden dag.",
      window: "Det valgte tidsrum er ikke tilgængeligt for denne adresse. Vælg venligst et andet.",
      minOrder: "For dette leveringsområde gælder en minimumsordre – gå venligst til kassen.",
      items: "En vare er ikke tilgængelig lige nu. Kontrollér venligst din kurv.",
      coupon: "Rabatkoden er ikke gyldig. Fjern den venligst, eller gå til kassen.",
      address: "Vælg venligst en fuldstændig leveringsadresse med husnummer, en e-mailadresse og et telefonnummer i din wallet.",
      amountChanged: "Beløbet er netop ændret. Start venligst ekspreskøbet igen – der er ikke trukket noget.",
      failed: "Ekspresbetalingen lykkedes ikke. Der er ikke trukket noget – prøv igen, eller gå til kassen.",
      connection: "Ingen forbindelse. Kontrollér venligst din internetforbindelse, og prøv igen.",
    },
    goods: "Blomster og ekstra",
    shipping: "Levering den {date}",
    shippingWindow: "Levering den {date}, {window}",
    legal: "Med {wallet} afgiver du en bestilling med betalingspligt · {terms} · {withdrawal}",
    terms: "Handelsbetingelser",
    withdrawal: "Fortrydelsesret",
    withdrawalNote: "For friske afskårne blomster gælder der ingen fortrydelsesret.",
  },
};

export default pay;
