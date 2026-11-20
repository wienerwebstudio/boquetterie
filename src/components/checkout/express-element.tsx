"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Elements, ExpressCheckoutElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type {
  Stripe, StripeElementsOptions, StripeExpressCheckoutElementClickEvent, StripeExpressCheckoutElementConfirmEvent,
  StripeExpressCheckoutElementShippingAddressChangeEvent,
} from "@stripe/stripe-js";
import type { OrderCreateResponse } from "@/types/payments";
import type { ExpressWalletData } from "@/lib/express";
import { useI18n, useLocalizedRouter } from "@/i18n/client";
import { amountChanged, displayCents, statusPath } from "./pay-logic";
import { STRIPE_APPEARANCE, STRIPE_FONTS, getStripe, reportPaymentProblem, stripeLocale } from "./stripe-shared";

/** Amounts and labels of the wallet sheet (line item + shipping rate add up to the total). */
export interface ExpressSheetDetails {
  totalCents: number;
  goodsCents: number;
  goodsLabel: string;
  shippingLabel: string;
}

type OrderAnswer = Partial<OrderCreateResponse> & { message?: string; errors?: Record<string, string> };

/** Line item + shipping rate for the sheet; the rate takes the rest so both add up exactly. */
function sheet(d: ExpressSheetDetails) {
  return {
    lineItems: [{ name: d.goodsLabel, amount: d.goodsCents }],
    shippingRates: [{ id: "delivery", displayName: d.shippingLabel, amount: Math.max(0, d.totalCents - d.goodsCents) }],
  };
}

/**
 * Stripe Express Checkout Element (deferred mode, no PaymentIntent until the customer
 * pays). Click → `clickDetails()` decides synchronously whether the sheet may open;
 * shipping address → `addressQuote()` (server: zone, fee); confirm → `elements.submit()`,
 * `POST /api/express/order`, amount check, `stripe.confirmPayment` with the new client
 * secret, `POST /api/payments/stripe/confirm`, status page.
 */
export function ExpressElement({ publishableKey, amount, wallets, onAvailability, clickDetails, addressQuote, orderBody, source, onError }: {
  publishableKey: string;
  /** EUR – the current quote (or the goods estimate before one exists). */
  amount: number;
  wallets: { applePay: boolean; googlePay: boolean; link: boolean };
  onAvailability: (available: boolean) => void;
  clickDetails: () => ExpressSheetDetails | null;
  addressQuote: (postalCode: string, country: string) => Promise<ExpressSheetDetails | null>;
  orderBody: (wallet: ExpressWalletData) => Record<string, unknown>;
  source: "product" | "cart";
  onError: (message: string | null) => void;
}) {
  const { locale } = useI18n();
  const [stripe, setStripe] = useState<Stripe | null>(null);

  useEffect(() => {
    let alive = true;
    getStripe(publishableKey)
      .then((s) => { if (!alive) return; if (s) setStripe(s); else onAvailability(false); })
      .catch(() => { if (alive) onAvailability(false); });
    return () => { alive = false; };
  }, [publishableKey, onAvailability]);

  const cents = displayCents(amount);
  const options = useMemo<StripeElementsOptions>(() => ({
    mode: "payment", amount: cents, currency: "eur",
    locale: stripeLocale(locale), appearance: STRIPE_APPEARANCE, fonts: STRIPE_FONTS,
  }), [cents, locale]);

  if (!stripe) return null;
  return (
    <Elements stripe={stripe} options={options}>
      <ExpressButtons wallets={wallets} onAvailability={onAvailability} clickDetails={clickDetails} addressQuote={addressQuote} orderBody={orderBody} source={source} onError={onError} />
    </Elements>
  );
}

function ExpressButtons({ wallets, onAvailability, clickDetails, addressQuote, orderBody, source, onError }: {
  wallets: { applePay: boolean; googlePay: boolean; link: boolean };
  onAvailability: (available: boolean) => void;
  clickDetails: () => ExpressSheetDetails | null;
  addressQuote: (postalCode: string, country: string) => Promise<ExpressSheetDetails | null>;
  orderBody: (wallet: ExpressWalletData) => Record<string, unknown>;
  source: "product" | "cart";
  onError: (message: string | null) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useLocalizedRouter();
  const { href, m } = useI18n();
  const t = m.pay.express;
  /** What the sheet currently shows (cents) – the order must cost exactly that. */
  const shown = useRef(0);
  /** Order of the last attempt: a retry with the same data continues it (no duplicate order). */
  const attempt = useRef<{ key: string; id: string; token: string; total: number; clientSecret: string } | null>(null);

  const onClick = (event: StripeExpressCheckoutElementClickEvent) => {
    const details = clickDetails();
    if (!details || !elements) { event.reject(); return; }
    shown.current = details.totalCents;
    elements.update({ amount: details.totalCents });
    event.resolve(sheet(details));
  };

  const onShippingAddressChange = async (event: StripeExpressCheckoutElementShippingAddressChangeEvent) => {
    const details = await addressQuote(event.address.postal_code, event.address.country);
    if (!details || !elements) { event.reject(); return; }
    shown.current = details.totalCents;
    elements.update({ amount: details.totalCents });
    event.resolve(sheet(details));
  };

  const onConfirm = async (event: StripeExpressCheckoutElementConfirmEvent) => {
    if (!stripe || !elements) { event.paymentFailed({ reason: "fail" }); return; }
    const submitted = await elements.submit();
    if (submitted.error) { onError(submitted.error.message ?? t.errors.failed); return; }

    const wallet: ExpressWalletData = {
      expressPaymentType: event.expressPaymentType,
      billingDetails: { name: event.billingDetails?.name, email: event.billingDetails?.email, phone: event.billingDetails?.phone },
      shippingAddress: { name: event.shippingAddress?.name, address: event.shippingAddress?.address },
    };
    const body = orderBody(wallet);
    const key = JSON.stringify(body);
    let order = attempt.current?.key === key ? attempt.current : null;
    if (!order) {
      let answer: OrderAnswer;
      try {
        const res = await fetch("/api/express/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        answer = (await res.json()) as OrderAnswer;
        if (!res.ok) answer.ok = undefined;
      } catch {
        event.paymentFailed({ reason: "fail" });
        onError(t.errors.connection);
        return;
      }
      if (!answer.ok || !answer.id || !answer.token || !answer.payment?.clientSecret || typeof answer.total !== "number") {
        const fields = Object.keys(answer.errors ?? {});
        const address = fields.some((f) => f.startsWith("recipient.") || f.startsWith("customer."));
        event.paymentFailed({ reason: fields.some((f) => f === "recipient.zip") ? "address_unserviceable" : address ? "invalid_shipping_address" : "fail" });
        onError(address ? (fields.includes("recipient.zip") ? t.errors.zone : t.errors.address) : answer.message ?? t.errors.failed);
        return;
      }
      order = { key, id: answer.id, token: answer.token, total: answer.total, clientSecret: answer.payment.clientSecret };
      attempt.current = order;
    }
    // Never charge something else than the sheet showed.
    if (amountChanged(order.total, shown.current)) {
      event.paymentFailed({ reason: "fail" });
      onError(t.errors.amountChanged);
      return;
    }
    const returnUrl = `${window.location.origin}${href("/checkout/rueckkehr")}?orderId=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.token)}`;
    const result = await stripe.confirmPayment({ elements, clientSecret: order.clientSecret, confirmParams: { return_url: returnUrl }, redirect: "if_required" });
    if (result.error) {
      if (result.error.type !== "validation_error") {
        reportPaymentProblem({ orderId: order.id, token: order.token, method: event.expressPaymentType }, "confirm_error", [result.error.type, result.error.code, result.error.decline_code, result.error.message].filter(Boolean).join(" · "));
      }
      onError(result.error.message ?? t.errors.failed);
      return;
    }
    try {
      await fetch("/api/payments/stripe/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, token: order.token }) });
    } catch { /* Stripe has the money; the webhook settles the order. */ }
    attempt.current = null;
    router.push(statusPath(order.id, order.token, source === "product" ? "&warenkorb=behalten" : ""));
  };

  return (
    <ExpressCheckoutElement
      options={{
        emailRequired: true,
        phoneNumberRequired: true,
        shippingAddressRequired: true,
        allowedShippingCountries: ["AT"],
        paymentMethods: {
          applePay: wallets.applePay ? "auto" : "never",
          googlePay: wallets.googlePay ? "auto" : "never",
          link: wallets.link ? "auto" : "never",
          amazonPay: "never", paypal: "never", klarna: "never",
        },
        buttonHeight: 48,
        buttonTheme: { applePay: "black", googlePay: "black" },
        layout: { maxColumns: 2, maxRows: 3, overflow: "never" },
      }}
      onReady={(e) => onAvailability(Boolean(e.availablePaymentMethods && Object.values(e.availablePaymentMethods).some(Boolean)))}
      onLoadError={() => onAvailability(false)}
      onClick={onClick}
      onShippingAddressChange={onShippingAddressChange}
      onConfirm={onConfirm}
      onCancel={() => onError(null)}
    />
  );
}
