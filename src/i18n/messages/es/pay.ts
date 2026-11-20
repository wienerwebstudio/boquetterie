import type { PartialMessages } from "@/i18n/messages";

/** es – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "Cargando el campo de pago …",
    loadFailed: "No se ha podido cargar el campo de pago. Vuelve a cargar la página, prueba otro navegador o elige otro método de pago. No se ha cobrado nada.",
    redirectHint: "Después de «Comprar ahora» confirmas el pago en {method}.",
    walletHint: "Después de «Comprar ahora» confirmas el pago con {method}.",
    amountChanged: "El total ahora es {total} (p. ej. por el envío o un cupón). Revísalo y vuelve a pulsar el botón – no se ha cobrado nada.",
    failed: "El pago no se ha completado: {reason} Tu pedido {orderId} está guardado pero aún no pagado – vuelve a intentarlo o elige otro método de pago.",
    retry: "Vuelve a introducir tus datos de pago y pulsa el botón otra vez.",
  },
  express: {
    title: "Compra exprés",
    /** Divider between the checkout button and the wallet buttons in the cart. */
    or: "o",
    intro: "Pide directamente con Apple Pay, Google Pay o Link – la dirección de entrega y los datos de contacto vienen de tu monedero.",
    postalCode: "Código postal del destinatario",
    date: "Día de entrega",
    window: "Franja horaria",
    choose: "Elige una opción",
    needPostalCode: "Introduce primero el código postal del destinatario.",
    needSlot: "Elige primero el día de entrega y la franja horaria.",
    noDays: "Para este código postal no hay ahora ningún día de entrega libre.",
    errors: {
      zone: "Lamentablemente no entregamos en este código postal. Elige una dirección dentro de nuestra zona de entrega.",
      date: "El día de entrega elegido no está disponible para esta dirección. Elige otro día.",
      window: "La franja horaria elegida no está disponible para esta dirección. Elige otra.",
      minOrder: "Para esta zona de entrega se aplica un importe mínimo de pedido – ve a la caja.",
      items: "Un artículo no está disponible en este momento. Revisa tu carrito.",
      coupon: "El cupón no es válido. Quítalo o ve a la caja.",
      address: "Elige en tu monedero una dirección de entrega completa con número, un correo electrónico y un número de teléfono.",
      amountChanged: "El importe acaba de cambiar. Vuelve a iniciar la compra exprés – no se ha cobrado nada.",
      failed: "El pago exprés no se ha completado. No se ha cobrado nada – vuelve a intentarlo o ve a la caja.",
      connection: "Sin conexión. Comprueba tu conexión a internet e inténtalo de nuevo.",
    },
    goods: "Flores y extras",
    shipping: "Entrega el {date}",
    shippingWindow: "Entrega el {date}, {window}",
    legal: "Con Apple Pay, Google Pay o Link realizas un pedido con obligación de pago. Se aplican nuestras {terms} y la {withdrawal}. Para flores cortadas frescas no existe derecho de desistimiento.",
    terms: "condiciones generales",
    withdrawal: "información sobre el desistimiento",
  },
};

export default pay;
