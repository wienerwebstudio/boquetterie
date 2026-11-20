import type { PartialMessages } from "@/i18n/messages";

/** en – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "Loading payment field …",
    loadFailed: "The payment field could not be loaded. Please reload the page, try another browser or choose a different payment method. Nothing has been charged.",
    redirectHint: "After “Buy now”, you confirm the payment with {method}.",
    walletHint: "After “Buy now”, you confirm the payment with {method}.",
    amountChanged: "The total is now {total} (e.g. because of the delivery fee or a voucher). Please check it and tap the button again – nothing has been charged.",
    failed: "The payment did not go through: {reason} Your order {orderId} is saved but not yet paid – try again right away or choose a different payment method.",
    retry: "Please enter your payment details again and tap the button once more.",
  },
  express: {
    title: "Express purchase",
    intro: "Order directly with Apple Pay, Google Pay or Link – delivery address and contact details come from your wallet.",
    postalCode: "Recipient’s postcode",
    date: "Delivery day",
    window: "Time window",
    choose: "Please choose",
    needPostalCode: "Please enter the recipient’s postcode first.",
    needSlot: "Please choose a delivery day and time window first.",
    noDays: "No delivery day is available for this postcode right now.",
    errors: {
      zone: "Unfortunately we don’t deliver to this postcode. Please choose an address in our delivery area.",
      date: "The chosen delivery day is not available for this address. Please choose another day.",
      window: "The chosen time window is not available for this address. Please choose another one.",
      minOrder: "A minimum order value applies to this delivery area – please go to checkout.",
      items: "An item is not available right now. Please check your cart.",
      coupon: "The voucher is not valid. Please remove it or go to checkout.",
      address: "Please choose a complete delivery address with house number, an email address and a phone number in your wallet.",
      amountChanged: "The amount has just changed. Please start the express purchase again – nothing has been charged.",
      failed: "The express payment did not go through. Nothing has been charged – try again or go to checkout.",
      connection: "No connection. Please check your internet connection and try again.",
    },
    goods: "Flowers & extras",
    shipping: "Delivery on {date}",
    shippingWindow: "Delivery on {date}, {window}",
    legal: "With Apple Pay, Google Pay or Link you place an order with an obligation to pay. Our {terms} and the {withdrawal} apply. There is no right of withdrawal for fresh cut flowers.",
    terms: "terms and conditions",
    withdrawal: "withdrawal policy",
  },
};

export default pay;
