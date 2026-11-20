import { expect, test, type Page } from "@playwright/test";
import { PLZ_SERVED, addAmourToCart } from "./helpers";

/**
 * Stripe path of checkout step 5 without Stripe keys in the environment: the methods
 * endpoint is intercepted to answer "provider stripe" with the shop's PUBLIC publishable
 * key (read from the live site at run time, never stored or printed). Elements run in
 * deferred mode, so no PaymentIntent is ever created; `/api/orders` and Stripe's
 * PaymentIntent endpoints are intercepted as a safety net and must not be reached.
 *
 * Opt-in (needs internet + js.stripe.com): E2E_STRIPE_UI=1 npx playwright test stripe-inline
 */
const LIVE_METHODS = "https://blumora.at/api/payments/methods";

test.describe("Stripe Payment Element inline @stripe", () => {
  test.skip(process.env.E2E_STRIPE_UI !== "1", "opt-in: E2E_STRIPE_UI=1");
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  let publishableKey = "";
  test.beforeAll(async () => {
    try {
      const res = await fetch(LIVE_METHODS);
      const body = (await res.json()) as { stripePublishableKey?: string };
      publishableKey = body.stripePublishableKey ?? "";
    } catch { /* offline */ }
  });

  async function interceptPayments(page: Page) {
    const orderCalls: string[] = [];
    await page.route("**/api/payments/methods", (route) => route.fulfill({
      json: {
        ok: true,
        methods: [
          { id: "google_pay", label: "Google Pay", provider: "stripe" },
          { id: "card", label: "Kreditkarte", provider: "stripe" },
          { id: "klarna", label: "Klarna", provider: "stripe" },
          { id: "eps", label: "Online-Überweisung (eps)", provider: "stripe" },
        ],
        stripePublishableKey: publishableKey,
        subscriptionCheckout: false,
      },
    }));
    await page.route("**/api/orders**", (route) => { orderCalls.push(route.request().url()); return route.fulfill({ status: 500, json: { ok: false, message: "intercepted" } }); });
    await page.route("**/api/express/**", (route) => route.fulfill({ status: 500, json: { ok: false, code: "unavailable", message: "intercepted" } }));
    // Never create or confirm a real PaymentIntent.
    await page.route(/api\.stripe\.com\/v1\/payment_intents/, (route) => route.abort());
    return orderCalls;
  }

  async function reachPaymentStep(page: Page) {
    await addAmourToCart(page);
    await page.getByRole("dialog", { name: /Warenkorb/ }).getByRole("link", { name: /Sicher zur Kasse/ }).click();
    await expect(page).toHaveURL(/\/checkout/);
    await page.getByLabel("Vorname").fill("Anna");
    await page.getByLabel("Nachname").fill("Huber");
    await page.getByLabel("Straße").fill("Wiedner Hauptstraße");
    await page.getByLabel("Hausnummer").fill("12");
    const zip = page.getByLabel("PLZ");
    if ((await zip.inputValue()) !== PLZ_SERVED) await zip.fill(PLZ_SERVED);
    await page.getByLabel("Telefonnummer für die Zustellung").fill("+43 664 1234567");
    await expect(page.getByText(/Lieferung möglich/)).toBeVisible();
    await page.getByRole("button", { name: "Weiter" }).click();
    const dates = page.getByRole("radiogroup", { name: "Lieferdatum" });
    if (!(await dates.getByRole("radio").first().isChecked())) await dates.locator("label").first().click();
    await page.getByRole("radiogroup", { name: "Lieferzeitfenster" }).locator("label").first().click();
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.getByLabel("Vorname").fill("Paul");
    await page.getByLabel("Nachname").fill("Maier");
    await page.getByLabel("E-Mail-Adresse").fill("paul.maier@example.com");
    await page.getByRole("textbox", { name: "Telefon", exact: true }).fill("0664 7654321");
    await page.getByRole("checkbox", { name: /AGB/ }).check();
    await page.getByRole("button", { name: "Weiter" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fast geschafft");
  }

  /** The inline box follows the label of the checked method directly. */
  function placedUnder(page: Page, label: string) {
    return page.getByTestId("payment-inline").evaluate((el, l) => {
      const prev = el.previousElementSibling;
      return Boolean(prev && prev.tagName === "LABEL" && prev.textContent?.includes(l) && prev.querySelector("input:checked"));
    }, label);
  }

  async function noHorizontalOverflow(page: Page) {
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  }

  test("renders the Payment Element under the selected method, submits before any order", async ({ page }) => {
    test.slow();
    test.skip(!publishableKey, "public publishable key not reachable");
    const orderCalls = await interceptPayments(page);
    await reachPaymentStep(page);

    const choose = async (label: string) => {
      const radio = page.getByRole("radio", { name: new RegExp(label) });
      await expect(async () => {
        await page.locator("label", { hasText: label }).click();
        await expect(radio).toBeChecked({ timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
    };

    /* ---- Kreditkarte: card fields inline, directly under its tile ---- */
    await choose("Kreditkarte");
    const inline = page.getByTestId("payment-inline");
    await expect(inline).toHaveCount(1);
    const frame = inline.locator("iframe[name^='__privateStripeFrame']");
    await expect(frame.first()).toBeAttached({ timeout: 30_000 });
    const buy = page.getByRole("button", { name: /Jetzt kaufen/ });
    await expect(buy).toBeEnabled({ timeout: 30_000 });
    const tile = await page.locator("label", { hasText: "Kreditkarte" }).boundingBox();
    const next = await page.locator("label", { hasText: "Klarna" }).boundingBox();
    const box = await inline.boundingBox();
    expect(tile && next && box).toBeTruthy();
    if (tile && next && box) {
      expect(box.y).toBeGreaterThanOrEqual(tile.y + tile.height - 2);
      expect(box.y + box.height).toBeLessThanOrEqual(next.y + 2);
      expect(box.height).toBeGreaterThan(80);
    }
    expect(await placedUnder(page, "Kreditkarte")).toBe(true);
    await noHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/stripe-inline-card.png", fullPage: true });

    /* ---- "Jetzt kaufen" with empty card fields: Stripe's submit() stops it – no order ---- */
    await buy.click();
    await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 15_000 });
    expect(orderCalls).toEqual([]);

    /* ---- Klarna: the element moves under Klarna ---- */
    await choose("Klarna");
    await expect(page.getByTestId("payment-inline")).toHaveCount(1);
    expect(await placedUnder(page, "Klarna")).toBe(true);
    await expect(page.getByTestId("payment-inline")).toContainText("Klarna");
    await expect(buy).toBeEnabled({ timeout: 30_000 });
    await noHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/stripe-inline-klarna.png", fullPage: true });
    expect(orderCalls).toEqual([]);
  });

  test("product page: express purchase never breaks the layout (shown only where a wallet is available)", async ({ page }) => {
    test.slow();
    test.skip(!publishableKey, "public publishable key not reachable");
    await interceptPayments(page);
    await addAmourToCart(page);
    await page.keyboard.press("Escape");
    const express = page.getByTestId("express-buy");
    await express.scrollIntoViewIfNeeded().catch(() => undefined);
    // Stripe decides per device which wallets exist (headless Chromium usually has none).
    await page.waitForTimeout(8_000);
    await noHorizontalOverflow(page);
    if (await express.count()) {
      await expect(express.locator("input[autocomplete=postal-code]")).toHaveValue(PLZ_SERVED);
      test.info().annotations.push({ type: "note", description: (await express.isVisible()) ? "express block visible" : "express block mounted but hidden (no wallet)" });
    } else {
      test.info().annotations.push({ type: "note", description: "no wallet on this device – express block removed" });
    }
    const cta = page.getByRole("button", { name: "In den Warenkorb" }).first();
    await cta.scrollIntoViewIfNeeded();
    await page.screenshot({ path: "test-results/express-product.png" });
  });
});
