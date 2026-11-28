import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getAvailablePaymentMethods, providerForMethod } from "@/lib/payments";
import { mockProvider } from "@/lib/payments/mock";
import type { Order, SiteSettings } from "@/types";

const settings = { payments: [{ id: "card", label: "Kreditkarte", enabled: true }, { id: "paypal", label: "PayPal", enabled: true }] } as unknown as SiteSettings;

describe("mock payments in production", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("never falls back to the mock provider on a live build without Stripe", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", ""); vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "");
    vi.stubEnv("PAYPAL_CLIENT_ID", ""); vi.stubEnv("PAYMENTS_ALLOW_MOCK", "");
    expect(providerForMethod("card")).toBeNull();
    expect(getAvailablePaymentMethods(settings)).toEqual([]);
    const res = await mockProvider.createPayment({ order: { payment: { method: "card" } } as Order, siteUrl: "https://blumora.at" });
    expect(res.status).toBe("failed");
  });

  it("uses Stripe once it is configured, and the mock only where explicitly allowed", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_ALLOW_MOCK", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", ""); vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "");
    expect(providerForMethod("card")).toBe("mock");
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_x"); vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test_x");
    expect(providerForMethod("card")).toBe("stripe");
  });

  it("routes PayPal to the direct app when its keys are set, else through Stripe, else hides it", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("PAYMENTS_ALLOW_MOCK", "true");
    vi.stubEnv("PAYPAL_CLIENT_ID", ""); vi.stubEnv("PAYPAL_CLIENT_SECRET", "");
    vi.stubEnv("STRIPE_SECRET_KEY", ""); vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "");
    expect(providerForMethod("paypal")).toBeNull();
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_x"); vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test_x");
    expect(providerForMethod("paypal")).toBe("stripe");
    vi.stubEnv("PAYPAL_CLIENT_ID", "id"); vi.stubEnv("PAYPAL_CLIENT_SECRET", "secret");
    expect(providerForMethod("paypal")).toBe("paypal");
  });

  it("keeps the mock in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STRIPE_SECRET_KEY", ""); vi.stubEnv("PAYMENTS_ALLOW_MOCK", "");
    expect(providerForMethod("card")).toBe("mock");
  });
});
