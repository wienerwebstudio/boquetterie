import "server-only";
import type { Order } from "@/types";
import type { CreatePaymentResult } from "@/types/payments";
import { WebhookVerificationError, type PaymentProviderAdapter, type VerifyResult, type WebhookResult } from "./provider";

/**
 * PayPal adapter – Orders API v2 via plain `fetch` (no SDK).
 *
 * Environment:
 *   PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET  REST app credentials
 *   PAYPAL_ENV                               "sandbox" (default) | "live"
 *   PAYPAL_WEBHOOK_ID                        optional – enables signature verification of webhooks
 *
 * Flow: `createPayment` creates a PayPal order (intent CAPTURE) and returns the
 * approve link. After approval PayPal redirects to `/api/payments/paypal/return`,
 * which captures the order server-side and marks it paid.
 */

export function paypalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function baseUrl() {
  return process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

let tokenCache: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set");
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.value;

  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { value: data.access_token, expiresAt: Date.now() + Math.max(60, data.expires_in - 60) * 1000 };
  return data.access_token;
}

interface PayPalCapture { id: string; status: string }
interface PayPalOrder {
  id: string;
  status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED";
  links?: { rel: string; href: string }[];
  purchase_units?: { reference_id?: string; custom_id?: string; payments?: { captures?: PayPalCapture[] } }[];
}
interface PayPalError { name?: string; message?: string; details?: { issue?: string; description?: string }[] }

async function api<T>(path: string, init: { method: "GET" | "POST"; body?: unknown; requestId?: string }): Promise<{ ok: true; data: T } | { ok: false; status: number; error: PayPalError }> {
  const token = await accessToken();
  const res = await fetch(`${baseUrl()}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : {};
  if (!res.ok) return { ok: false, status: res.status, error: json as PayPalError };
  return { ok: true, data: json as T };
}

function captureOf(order: PayPalOrder): PayPalCapture | undefined {
  return order.purchase_units?.[0]?.payments?.captures?.find((c) => c.status === "COMPLETED") ?? order.purchase_units?.[0]?.payments?.captures?.[0];
}

function orderToVerify(order: PayPalOrder): VerifyResult {
  const capture = captureOf(order);
  const base = { intentId: order.id, reference: capture?.id };
  switch (order.status) {
    case "COMPLETED":
      return capture && capture.status !== "COMPLETED"
        ? { status: "pending", ...base, message: "Die Zahlung wird von PayPal geprüft." }
        : { status: "paid", ...base };
    case "VOIDED":
      return { status: "failed", ...base, message: "Die PayPal-Zahlung wurde abgebrochen." };
    default:
      return { status: "pending", ...base, message: "Die PayPal-Zahlung ist noch nicht abgeschlossen." };
  }
}

/** Captures an approved PayPal order. Idempotent: an already captured order is reported as paid. */
export async function capturePayPalOrder(paypalOrderId: string, ourOrderId: string): Promise<VerifyResult> {
  const res = await api<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, { method: "POST", body: {}, requestId: `capture_${ourOrderId}` });
  if (res.ok) return orderToVerify(res.data);
  const issue = res.error.details?.[0]?.issue;
  if (issue === "ORDER_ALREADY_CAPTURED") {
    const current = await api<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, { method: "GET" });
    return current.ok ? orderToVerify(current.data) : { status: "unknown" };
  }
  if (issue === "INSTRUMENT_DECLINED") return { status: "failed", intentId: paypalOrderId, message: "PayPal hat das Zahlungsmittel abgelehnt." };
  console.error("[paypal] capture failed", res.status, res.error);
  return { status: "failed", intentId: paypalOrderId, message: res.error.details?.[0]?.description ?? "Die PayPal-Zahlung konnte nicht abgeschlossen werden." };
}

export const paypalProvider: PaymentProviderAdapter = {
  id: "paypal",
  isConfigured: paypalConfigured,

  async createPayment({ order, siteUrl }): Promise<CreatePaymentResult> {
    const q = `orderId=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.token)}`;
    const res = await api<PayPalOrder>("/v2/checkout/orders", {
      method: "POST",
      requestId: `create_${order.id}`,
      body: {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: order.id,
            custom_id: order.id,
            description: `Bloomery Bestellung ${order.id}`,
            amount: { currency_code: "EUR", value: order.totals.total.toFixed(2) },
          },
        ],
        application_context: {
          brand_name: "Bloomery",
          locale: "de-AT",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          return_url: `${siteUrl}/api/payments/paypal/return?${q}`,
          cancel_url: `${siteUrl}/api/payments/paypal/cancel?${q}`,
        },
      },
    });
    if (!res.ok) {
      console.error("[paypal] create order failed", res.status, res.error);
      return { status: "failed", provider: "paypal", message: "PayPal ist gerade nicht erreichbar. Bitte wähle eine andere Zahlungsart." };
    }
    const approveUrl = res.data.links?.find((l) => l.rel === "approve" || l.rel === "payer-action")?.href;
    if (!approveUrl) return { status: "failed", provider: "paypal", intentId: res.data.id, message: "PayPal hat keinen Freigabe-Link geliefert." };
    return { status: "pending", provider: "paypal", intentId: res.data.id, approveUrl };
  },

  async verifyPayment(order: Order): Promise<VerifyResult> {
    if (!order.payment.intentId) return { status: "unknown" };
    const res = await api<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(order.payment.intentId)}`, { method: "GET" });
    if (!res.ok) return { status: "unknown", message: "PayPal-Bestellung nicht gefunden." };
    const custom = res.data.purchase_units?.[0]?.custom_id;
    if (custom && custom !== order.id) return { status: "unknown", message: "Zahlung gehört zu einer anderen Bestellung." };
    return orderToVerify(res.data);
  },

  async processWebhook(req: Request): Promise<WebhookResult> {
    const raw = await req.text();
    let body: { id?: string; event_type?: string; resource?: Record<string, unknown> };
    try {
      body = JSON.parse(raw) as typeof body;
    } catch {
      throw new WebhookVerificationError("Invalid JSON");
    }

    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (webhookId) {
      const h = (name: string) => req.headers.get(name) ?? "";
      const verify = await api<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", {
        method: "POST",
        body: {
          auth_algo: h("paypal-auth-algo"),
          cert_url: h("paypal-cert-url"),
          transmission_id: h("paypal-transmission-id"),
          transmission_sig: h("paypal-transmission-sig"),
          transmission_time: h("paypal-transmission-time"),
          webhook_id: webhookId,
          webhook_event: body,
        },
      });
      if (!verify.ok || verify.data.verification_status !== "SUCCESS") {
        throw new WebhookVerificationError("PayPal webhook signature verification failed");
      }
    } else if (process.env.NODE_ENV === "production") {
      // Without PAYPAL_WEBHOOK_ID we cannot prove the sender – ignore the event rather than trusting it.
      console.warn("[paypal] webhook received but PAYPAL_WEBHOOK_ID is not set – event ignored");
      return { type: body.event_type ?? "unknown", event: null };
    }

    const type = body.event_type ?? "unknown";
    const resource = body.resource ?? {};
    const custom = typeof resource.custom_id === "string" ? resource.custom_id : undefined;
    const related = (resource.supplementary_data as { related_ids?: { order_id?: string } } | undefined)?.related_ids?.order_id;
    const captureId = typeof resource.id === "string" ? resource.id : undefined;

    switch (type) {
      case "PAYMENT.CAPTURE.COMPLETED":
        return { type, event: { kind: "paid", orderId: custom, intentId: related, reference: captureId, note: "Zahlung per PayPal bestätigt" } };
      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.DECLINED":
        return { type, event: { kind: "failed", orderId: custom, intentId: related, reference: captureId, note: "Zahlung per PayPal abgelehnt" } };
      case "PAYMENT.CAPTURE.REFUNDED":
      case "PAYMENT.CAPTURE.REVERSED":
        return { type, event: { kind: "refunded", orderId: custom, intentId: related, reference: captureId, note: "Zahlung per PayPal erstattet" } };
      default:
        return { type, event: null };
    }
  },
};
