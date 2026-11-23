import type { PartialMessages } from "@/i18n/messages";

/** sv – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "Betalningsfältet laddas …",
    loadFailed: "Betalningsfältet kunde inte laddas. Ladda om sidan, prova en annan webbläsare eller välj ett annat betalsätt. Inget har dragits.",
    redirectHint: "Efter ”Köp nu” bekräftar du betalningen hos {method}.",
    walletHint: "Efter ”Köp nu” bekräftar du betalningen med {method}.",
    amountChanged: "Totalbeloppet är nu {total} (t.ex. på grund av leveransavgift eller presentkort). Kontrollera det och tryck på knappen en gång till – inget har dragits.",
    failed: "Betalningen gick inte igenom: {reason} Din beställning {orderId} är sparad men ännu inte betald – försök igen direkt eller välj ett annat betalsätt.",
    retry: "Ange dina betalningsuppgifter igen och tryck på knappen en gång till.",
  },
  express: {
    title: "Expressköp",
    intro: "Beställ direkt med Apple Pay, Google Pay eller Link – leveransadress och kontaktuppgifter hämtas från din wallet.",
    postalCode: "Mottagarens postnummer",
    date: "Leveransdag",
    window: "Tidsfönster",
    choose: "Välj",
    needPostalCode: "Ange först mottagarens postnummer.",
    needSlot: "Välj först leveransdag och tidsfönster.",
    noDays: "Det finns ingen ledig leveransdag för det här postnumret just nu.",
    errors: {
      zone: "Vi levererar tyvärr inte till det här postnumret. Välj en adress inom vårt leveransområde.",
      date: "Den valda leveransdagen är inte tillgänglig för den här adressen. Välj en annan dag.",
      window: "Det valda tidsfönstret är inte tillgängligt för den här adressen. Välj ett annat.",
      minOrder: "För det här leveransområdet gäller ett minsta ordervärde – gå till kassan.",
      items: "En artikel är inte tillgänglig just nu. Kontrollera din varukorg.",
      coupon: "Rabattkoden är inte giltig. Ta bort den eller gå till kassan.",
      address: "Välj en fullständig leveransadress med husnummer, en e-postadress och ett telefonnummer i din wallet.",
      amountChanged: "Beloppet har just ändrats. Starta expressköpet igen – inget har dragits.",
      failed: "Expressbetalningen gick inte igenom. Inget har dragits – försök igen eller gå till kassan.",
      connection: "Ingen anslutning. Kontrollera din internetanslutning och försök igen.",
    },
    goods: "Blommor & tillbehör",
    shipping: "Leverans den {date}",
    shippingWindow: "Leverans den {date}, {window}",
    legal: "Med {wallet} gör du en beställning med betalningsskyldighet · {terms} · {withdrawal}",
    terms: "Allmänna villkor",
    withdrawal: "Ångerrätt",
    withdrawalNote: "För färska snittblommor gäller ingen ångerrätt.",
  },
};

export default pay;
