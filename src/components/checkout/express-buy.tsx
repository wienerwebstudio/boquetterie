"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "@/components/ui/link";
import type { CartItem } from "@/types";
import type { ExpressQuoteResponse } from "@/types/payments";
import { normalizePostalCode } from "@/lib/delivery";
import { computeTotals } from "@/lib/pricing";
import { routes } from "@/lib/urls";
import { cn } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import type { ExpressWalletData } from "@/lib/express";
import { useCartDelivery, type CartDeliveryState } from "@/components/cart/cart-delivery";
import { rich } from "./rich-text";
import { usePaymentMethods } from "./use-payment-methods";
import type { ExpressAbandonInfo, ExpressSheetDetails, ExpressWallet } from "./express-element";
import { clearDraftId, draftId, peekDraftId, postDraft } from "./checkout-draft";

// Stripe.js is loaded only when the block scrolls into view and Stripe is configured.
const ExpressElement = dynamic(() => import("./express-element").then((m) => m.ExpressElement), { ssr: false });

/** Quote error code → key in `pay.express.errors`. */
const ERROR_KEYS = {
  zone: "zone", date: "date", window: "window", min_order: "minOrder", items: "items", coupon: "coupon", unavailable: "failed",
} as const satisfies Record<Extract<ExpressQuoteResponse, { ok: false }>["code"], string>;

const WALLET_NAMES: Record<ExpressWallet, string> = { applePay: "Apple Pay", googlePay: "Google Pay", link: "Link" };

type Layout = "drawer" | "page";

/**
 * "Express-Kauf" with Apple Pay / Google Pay (Stripe Express Checkout Element) in the cart
 * drawer and on the cart page, next to / under the checkout button (`primary`). Without
 * Stripe or a wallet on the device only `primary` is rendered. PLZ, delivery day and time
 * window come from the cart lines (`CartDeliveryProvider`); if something is missing there,
 * a tap on the wallet button does not open the sheet but scrolls to the cart line, which
 * shows the fields. The sheet collects the recipient address (restricted to our delivery
 * zones via `/api/express/quote`), name, e-mail and phone, and `/api/express/order` creates
 * the order with exactly the checkout's rules.
 */
export function ExpressBuy({ items, couponCode, source, layout, primary, className }: {
  items: CartItem[];
  couponCode?: string | null;
  source: "cart";
  /** "drawer": checkout + wallet button side by side (from 360px), only the device's wallet. "page": stacked, Link as well. */
  layout: Layout;
  /** The checkout button. */
  primary: React.ReactNode;
  className?: string;
}) {
  const { data } = usePaymentMethods();
  const delivery = useCartDelivery();
  const stripeMethods = useMemo(() => new Set((data?.methods ?? []).filter((x) => x.provider === "stripe").map((x) => x.id)), [data]);
  // Only the device's wallet: Apple Pay where it is set up, otherwise Google Pay (never both). Link only on the cart page.
  const wallets = useMemo(() => {
    const applePay = stripeMethods.has("apple_pay");
    return { applePay, googlePay: !applePay && stripeMethods.has("google_pay"), link: layout === "page" && stripeMethods.has("card") };
  }, [stripeMethods, layout]);
  const enabled = Boolean(data?.stripePublishableKey) && (wallets.applePay || wallets.googlePay || wallets.link);
  const ref = useRef<HTMLDivElement>(null);
  // Without IntersectionObserver (old browsers) load right away.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const el = ref.current;
    if (!enabled || inView || !el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, inView]);

  const ready = enabled && inView && delivery && items.length > 0 && data?.stripePublishableKey;
  return (
    <div ref={ref} className={className}>
      {ready ? (
        <ExpressPanel
          publishableKey={data.stripePublishableKey!} wallets={wallets} delivery={delivery}
          items={items} couponCode={couponCode} source={source} layout={layout} primary={primary}
        />
      ) : primary}
    </div>
  );
}

function ExpressPanel({ publishableKey, wallets, delivery, items, couponCode, source, layout, primary }: {
  publishableKey: string;
  wallets: { applePay: boolean; googlePay: boolean; link: boolean };
  delivery: CartDeliveryState;
  items: CartItem[];
  couponCode?: string | null;
  source: "cart";
  layout: Layout;
  primary: React.ReactNode;
}) {
  const uid = useId();
  const { m, fmt, dateShort, locale } = useI18n();
  const t = m.pay.express;
  /** Wallet buttons Stripe shows on this device (null until it reported). */
  const [shown, setShown] = useState<ExpressWallet[] | null>(null);
  const available = shown ? shown.length > 0 : null;
  const [error, setError] = useState<string | null>(null);
  const { postalCode: plz, date: day, windowId, windows, complete: slotComplete, requestAttention, setWalletReady } = delivery;

  useEffect(() => { setWalletReady(Boolean(available)); }, [available, setWalletReady]);
  useEffect(() => () => setWalletReady(false), [setWalletReady]);
  const onWallets = useCallback((list: ExpressWallet[]) => setShown(list), []);

  /* ---- Server quote for the chosen slot (what the wallet sheet shows) ---- */
  const itemsKey = JSON.stringify(items.map((i) => ({
    productId: i.productId, sizeId: i.sizeId, quantity: i.quantity,
    ...(i.colorId && { colorId: i.colorId }),
    ...(i.floristNote && { floristNote: i.floristNote }),
    extras: i.extras.map((e) => ({ extraId: e.extraId, quantity: e.quantity })),
    ...(i.message && { message: i.message, anonymous: Boolean(i.anonymous), ...(i.senderName && !i.anonymous ? { senderName: i.senderName } : {}) }),
  })));
  const payloadItems = useMemo(() => JSON.parse(itemsKey) as unknown[], [itemsKey]);
  const [quote, setQuote] = useState<{ key: string; value: ExpressQuoteResponse } | null>(null);
  const quoteKey = JSON.stringify({ payloadItems, couponCode, plz, day, windowId });

  const fetchQuote = useCallback(async (zip: string): Promise<ExpressQuoteResponse> => {
    try {
      const res = await fetch("/api/express/quote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloadItems, couponCode: couponCode || undefined, postalCode: zip, date: day, windowId: windowId || undefined }),
      });
      return (await res.json()) as ExpressQuoteResponse;
    } catch {
      return { ok: false, code: "unavailable", message: "" };
    }
  }, [payloadItems, couponCode, day, windowId]);

  useEffect(() => {
    if (!slotComplete) return;
    let alive = true;
    const key = quoteKey;
    void fetchQuote(plz).then((value) => { if (alive) setQuote({ key, value }); });
    return () => { alive = false; };
  }, [slotComplete, quoteKey, fetchQuote, plz]);

  const current = quote?.key === quoteKey ? quote.value : null;
  const errorText = useCallback((q: Extract<ExpressQuoteResponse, { ok: false }>) => t.errors[ERROR_KEYS[q.code] ?? "failed"], [t]);
  const estimate = computeTotals({ items }).subtotal;
  const amount = current?.ok ? current.total : estimate;
  const windowLabel = windows.find((w) => w.id === windowId)?.label;

  const sheetFor = useCallback((q: Extract<ExpressQuoteResponse, { ok: true }>): ExpressSheetDetails => ({
    totalCents: Math.round(q.total * 100),
    goodsCents: Math.round(q.goods * 100),
    goodsLabel: t.goods,
    shippingLabel: q.windowLabel ? fmt(t.shippingWindow, { date: dateShort(day), window: q.windowLabel }) : fmt(t.shipping, { date: dateShort(day) }),
  }), [t, fmt, dateShort, day]);

  /** Called synchronously when a wallet button is clicked: everything chosen? Otherwise the cart line asks for it. */
  const clickDetails = useCallback((): ExpressSheetDetails | null => {
    if (!slotComplete) { setError(null); requestAttention(); return null; }
    if (!current) { setError(t.needSlot); return null; }
    if (!current.ok) { setError(errorText(current)); return null; }
    setError(null);
    return sheetFor(current);
  }, [slotComplete, current, errorText, sheetFor, requestAttention, t]);

  /** The wallet's shipping address changed (only PLZ/city/country are known yet). */
  const addressQuote = useCallback(async (zip: string, country: string): Promise<ExpressSheetDetails | null> => {
    if (country.toUpperCase() !== "AT") { setError(t.errors.zone); return null; }
    const q = await fetchQuote(normalizePostalCode(zip));
    if (!q.ok) { setError(errorText(q)); return null; }
    setError(null);
    return sheetFor(q);
  }, [fetchQuote, errorText, sheetFor, t]);

  const draftScope = `express-${source}`;
  const orderBody = useCallback((wallet: ExpressWalletData) => ({
    items: payloadItems,
    couponCode: couponCode || undefined,
    delivery: { date: day, windowId: windowId || undefined },
    wallet,
    acceptedTerms: true,
    locale,
    // An earlier closed sheet of this session ("Abgebrochene Kasse") is removed once the order exists.
    draftId: peekDraftId(draftScope),
  }), [payloadItems, couponCode, day, windowId, locale, draftScope]);

  /** Sheet closed without an order: record what we know for the team (no contact data unless the wallet released it). */
  const onAbandon = useCallback((info: ExpressAbandonInfo) => {
    const [firstName = "", ...rest] = (info.contact?.name ?? "").trim().split(/\s+/);
    const contact = info.contact && (info.contact.email || info.contact.phone)
      ? { firstName, lastName: rest.join(" "), email: info.contact.email ?? "", phone: info.contact.phone ?? "" }
      : undefined;
    postDraft({
      id: draftId(draftScope), source: "express", locale,
      items: payloadItems, couponCode: couponCode || undefined,
      delivery: day ? { date: day, windowId: windowId || undefined } : undefined,
      express: { wallet: info.wallet, postalCode: info.address?.postalCode || plz, city: info.address?.city, country: info.address?.country },
      ...(contact ? { contact } : {}),
    });
  }, [draftScope, locale, payloadItems, couponCode, day, windowId, plz]);
  const onOrderCreated = useCallback(() => clearDraftId(draftScope), [draftScope]);

  const walletName = (shown ?? []).map((w) => WALLET_NAMES[w]).join(" / ");
  const drawer = layout === "drawer";
  const element = (
    <ExpressElement
      publishableKey={publishableKey}
      amount={amount}
      wallets={wallets}
      buttonHeight={44}
      buttonType={drawer ? "plain" : "buy"}
      onWallets={onWallets}
      clickDetails={clickDetails}
      addressQuote={addressQuote}
      orderBody={orderBody}
      source={source}
      onError={setError}
      onAbandon={onAbandon}
      onOrderCreated={onOrderCreated}
    />
  );

  return (
    <section aria-labelledby={`${uid}-title`} data-testid="express-buy" data-layout={layout}>
      <h2 id={`${uid}-title`} className="sr-only">{t.title}</h2>
      <div className={cn("relative flex flex-col gap-2", drawer && available && "min-[360px]:flex-row min-[360px]:items-center")}>
        <div className={cn("min-w-0", drawer && available && "min-[360px]:flex-1")}>{primary}</div>
        {/* Until Stripe reports a wallet on this device the buttons stay collapsed and out of the tab order. */}
        <div
          aria-hidden={!available || undefined}
          inert={!available || undefined}
          className={cn(
            available ? "min-h-11 animate-fade-in" : "pointer-events-none absolute inset-x-0 top-0 h-0 overflow-hidden",
            available && drawer && "min-[360px]:w-[42%] min-[360px]:shrink-0",
          )}
          data-testid="express-wallets"
        >
          {element}
        </div>
      </div>
      {windowLabel && <span className="sr-only" aria-live="polite">{windowLabel}</span>}
      {error && <p role="alert" className="mt-2 rounded-md border border-danger/30 bg-rose-100/60 px-3 py-2 text-[13px] text-ink">{error}</p>}
      {available && (
        <p className="mt-1.5 text-center text-[11px] leading-snug text-ink-soft" data-testid="express-legal">
          {rich(t.legal, {
            wallet: walletName,
            terms: <Link href={routes.legal.terms} className="underline underline-offset-2">{t.terms}</Link>,
            withdrawal: <Link href={routes.legal.withdrawal} title={t.withdrawalNote} className="underline underline-offset-2">{t.withdrawal}</Link>,
          })}
        </p>
      )}
    </section>
  );
}
