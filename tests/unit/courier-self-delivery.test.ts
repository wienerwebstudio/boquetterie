import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/mail", () => ({ sendOrderStatusUpdate: vi.fn() }));
const order = { id: "BQ-SAT1", delivery: { date: "2026-11-21" }, payment: { status: "paid" }, status: "paid", history: [] };
vi.mock("@/lib/cms", () => ({
  getSettings: vi.fn(async () => ({ selfDeliveryDays: [6, 0], timezone: "Europe/Vienna", brand: { name: "Blumora" } })),
  getOrderById: vi.fn(async () => order),
  getOrders: vi.fn(async () => [order]),
  updateOrder: vi.fn(),
}));

describe("automatic courier booking on self-delivery days", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("does not book a rider for a Saturday when Saturday is ticked – manual booking still goes through", async () => {
    vi.stubEnv("RIDERX_CLIENT_ID", "id"); vi.stubEnv("RIDERX_CLIENT_SECRET", "secret");
    vi.stubEnv("RIDERX_PICKUP_STREET", "Teststraße"); vi.stubEnv("RIDERX_PICKUP_HOUSE_NUMBER", "1"); vi.stubEnv("RIDERX_PICKUP_ZIP", "1010");
    vi.stubEnv("RIDERX_AUTO_BOOK", "true");
    const { bookCourier } = await import("@/lib/courier");
    const cms = await import("@/lib/cms");
    const res = await bookCourier("BQ-SAT1");
    expect(res).toEqual({ ok: false, message: expect.stringContaining("Selbst ausliefern") });
    expect(cms.updateOrder).not.toHaveBeenCalled();

    // Manual booking skips the check and claims the order.
    await bookCourier("BQ-SAT1", { manual: true });
    expect(cms.updateOrder).toHaveBeenCalled();
  });
});
