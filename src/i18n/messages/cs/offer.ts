import type { PartialMessages } from "@/i18n/messages";

/** cs – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Vaše nabídka",
  eyebrow: "Osobní nabídka {id}",
  title: "Vaše osobní nabídka",
  intro: "Dobrý den, {name}, zde je vaše nabídka. Vše si v klidu zkontrolujte a bezpečně zaplaťte online.",
  items: "Vaše květiny",
  delivery: "Doručení",
  date: "Termín",
  place: "Místo doručení",
  recipient: "Příjemce",
  card: "Přání",
  flowers: "Květiny",
  extras: "Doplňky",
  deliveryFee: "Doručení",
  free: "zdarma",
  validUntil: "Platí do {date}",
  payTitle: "Platba",
  pay: "Zaplatit nyní · {total}",
  acceptTerms: "Přečetl/a jsem si {terms} a {withdrawal}.",
  acceptTermsError: "Potvrďte prosím obchodní podmínky.",
  paidTitle: "Děkujeme – již zaplaceno",
  paidText: "Tato nabídka je zaplacena. Potvrzení objednávky jste obdrželi e-mailem.",
  viewOrder: "Zobrazit objednávku",
  expiredTitle: "Platnost nabídky vypršela",
  expiredText: "Tato nabídka již neplatí. Klidně nám napište – připravíme vám novou.",
  cancelledTitle: "Nabídka již není k dispozici",
  cancelledText: "Tato nabídka byla stažena. S případnými dotazy se nám klidně ozvěte.",
  cancelledPayment: "Platba nebyla dokončena. Můžete to zkusit znovu.",
  failed: "Platbu se nepodařilo spustit. Zkuste to prosím znovu.",
  byArrangement: "Po domluvě",
  previewTitle: "Náhled – zatím neodesláno",
  previewText: "Tato nabídka je zatím koncept. Takto ji uvidí zákazník. Zaplatit lze teprve poté, co ji odešlete nebo zkopírujete odkaz.",
};

export default offer;
