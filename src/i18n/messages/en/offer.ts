import type { PartialMessages } from "@/i18n/messages";

/** en – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Your offer",
  eyebrow: "Personal offer {id}",
  title: "Your personal offer",
  intro: "Hello {name}, here is your offer. Take your time to check everything and pay securely online.",
  items: "Your flowers",
  delivery: "Delivery",
  date: "Date & time",
  place: "Delivery place",
  recipient: "Recipient",
  card: "Greeting card",
  flowers: "Flowers",
  extras: "Extras",
  deliveryFee: "Delivery",
  free: "free",
  validUntil: "Valid until {date}",
  payTitle: "Payment",
  pay: "Pay now · {total}",
  acceptTerms: "I have read the {terms} and the {withdrawal}.",
  acceptTermsError: "Please accept the terms and conditions.",
  paidTitle: "Thank you – already paid",
  paidText: "This offer has been paid. You received your order confirmation by email.",
  viewOrder: "View order",
  expiredTitle: "Offer expired",
  expiredText: "This offer is no longer valid. Just write to us – we will gladly make you a new one.",
  cancelledTitle: "Offer no longer available",
  cancelledText: "This offer has been withdrawn. If you have any questions, please write to us.",
  cancelledPayment: "The payment was not completed. You can try again.",
  failed: "The payment could not be started. Please try again.",
  byArrangement: "As arranged",
  previewTitle: "Preview – not sent yet",
  previewText: "This offer is still a draft. This is how the customer will see it. Payment is only possible once it has been sent or its link copied.",
};

export default offer;
