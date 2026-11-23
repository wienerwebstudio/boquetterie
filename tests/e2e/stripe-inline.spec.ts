import { expect, test, type Page } from "@playwright/test";
import { PLZ_SERVED, addAmourToCart, gotoPage } from "./helpers";

/**
 * Stripe path of checkout step 5 without Stripe keys in the environment: the methods
 * endpoint is intercepted to answer "provider stripe" with the shop's PUBLIC publishable
 * key (read from the live site at run time, never stored or printed). Elements run in
 * deferred mode, so no PaymentIntent is ever created. `/api/orders` is intercepted (a fake
 * pending order whose client secret is never confirmed) and Stripe's PaymentIntent
 * endpoints are blocked.
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
    const notes: Record<string, unknown>[] = [];
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
    await page.route("**/api/orders**", (route) => {
      const url = route.request().url();
      if (url.includes("/api/orders/payment-note")) {
        notes.push(route.request().postDataJSON() as Record<string, unknown>);
        return route.fulfill({ json: { ok: true, added: true } });
      }
      orderCalls.push(url);
      // A pending order as the server would create it – its secret is never confirmed here.
      return route.fulfill({ status: 201, json: { ok: true, id: "BQ-E2EFAKE", token: "f".repeat(24), status: "received", payment: { provider: "stripe", status: "pending", clientSecret: "pi_e2e_fake_secret_e2e" } } });
    });
    // Never create or confirm a real PaymentIntent.
    await page.route(/api\.stripe\.com\/v1\/payment_intents/, (route) => route.abort());
    return { orderCalls, notes };
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

  test("renders the Payment Element under the selected method; empty fields still create the (pending) order", async ({ page }) => {
    test.slow();
    test.skip(!publishableKey, "public publishable key not reachable");
    const { orderCalls, notes } = await interceptPayments(page);
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

    /* ---- "Jetzt kaufen" with empty card fields: Stripe's submit() stops the payment, but the
       order exists (the team sees the contact data) with the note "Kartenangaben unvollständig" ---- */
    await buy.click();
    await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => orderCalls.length).toBe(1);
    await expect.poll(() => notes.length).toBe(1);
    expect(notes[0]).toMatchObject({ orderId: "BQ-E2EFAKE", reason: "incomplete", method: "card" });

    /* ---- A second click reuses the same order – no new request ---- */
    await buy.click();
    await expect.poll(() => notes.length).toBe(2);
    expect(orderCalls).toHaveLength(1);

    /* ---- Klarna: the element moves under Klarna ---- */
    await choose("Klarna");
    await expect(page.getByTestId("payment-inline")).toHaveCount(1);
    expect(await placedUnder(page, "Klarna")).toBe(true);
    await expect(page.getByTestId("payment-inline")).toContainText("Klarna");
    await expect(buy).toBeEnabled({ timeout: 30_000 });
    await noHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/stripe-inline-klarna.png", fullPage: true });
    expect(orderCalls).toHaveLength(1);
  });


  /** Stripe throws IntegrationErrors for invalid element options (e.g. layout) – they hid the express buttons once. */
  function collectStripeErrors(page: Page) {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    return () => pageErrors.filter((m) => /stripe|options\./i.test(m));
  }

  /** The drawer's sticky footer (container of total, checkout and wallet button). */
  const drawerFooter = (page: Page) => page.getByRole("dialog", { name: /Warenkorb/ }).getByTestId("cart-drawer-footer").locator("xpath=..");
  const VIEWPORT_HEIGHT = 844;

  test("cart drawer: compact footer – total in one line, checkout button, no fields, no express (≤ 40 % of 390×844)", async ({ page }) => {
    test.slow();
    test.skip(!publishableKey, "public publishable key not reachable");
    const stripeErrors = collectStripeErrors(page);
    await interceptPayments(page);
    await addAmourToCart(page);
    await expect(page.getByRole("main").getByTestId("express-buy")).toHaveCount(0);
    const drawer = page.getByRole("dialog", { name: /Warenkorb/ });
    const footer = drawerFooter(page);

    const total = footer.getByText(/^Gesamt · (inkl|zzgl)\. Lieferung$/);
    await expect(total).toBeVisible();
    const totalRow = await footer.locator("p").first().boundingBox();
    expect(totalRow!.height).toBeLessThan(32); // one line
    // Delivery fields live at the cart line, the trust row below the summary – nothing of that in the footer.
    await expect(footer.locator("select, input")).toHaveCount(0);
    await expect(footer.getByText(/^oder$/)).toHaveCount(0);
    await expect(footer.getByText("Sichere Zahlung")).toHaveCount(0);
    await expect(drawer.getByText("Sichere Zahlung")).toHaveCount(1);

    const checkout = await footer.getByRole("link", { name: /Sicher zur Kasse/ }).boundingBox();
    expect(Math.round(checkout!.height)).toBe(48);
    // Express-Kauf was removed (owners' decision): only the checkout button, no wallet block.
    await expect(drawer.getByTestId("express-buy")).toHaveCount(0);
    const box = await footer.boundingBox();
    test.info().annotations.push({ type: "footer-height", description: `${Math.round(box!.height)}px of ${VIEWPORT_HEIGHT}px` });
    expect(box!.height).toBeLessThanOrEqual(VIEWPORT_HEIGHT * 0.4);
    await noHorizontalOverflow(page);
    expect(stripeErrors()).toEqual([]);
    await page.screenshot({ path: "test-results/cart-drawer-390.png" });
  });

  test("cart drawer: an expired delivery day shows the notice and a day select at the cart line", async ({ page }) => {
    test.slow();
    test.skip(!publishableKey, "public publishable key not reachable");
    const stripeErrors = collectStripeErrors(page);
    await interceptPayments(page);
    await addAmourToCart(page);
    // The day of the stored cart line has passed (cart from an earlier visit).
    await page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem("blumora-cart") ?? "{}") as { state: { items: Record<string, unknown>[] } };
      stored.state.items = stored.state.items.map((i) => ({ ...i, deliveryDate: "2020-01-02" }));
      localStorage.setItem("blumora-cart", JSON.stringify(stored));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Warenkorb, 1 Artikel/ }).click();
    const drawer = page.getByRole("dialog", { name: /Warenkorb/ });
    const notice = drawer.getByTestId("cart-line-delivery");
    await expect(notice).toHaveAttribute("data-issue", "expired");
    await expect(notice).toContainText("Liefertermin abgelaufen – bitte neu wählen");
    const day = notice.getByRole("combobox", { name: "Liefertag" });
    await expect(day).toBeVisible();
    const footer = drawerFooter(page);
    await expect(footer.locator("select, input")).toHaveCount(0);
    const box = await footer.boundingBox();
    expect(box!.height).toBeLessThanOrEqual(VIEWPORT_HEIGHT * 0.4);
    await noHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/cart-drawer-expired-390.png" });

    // A new day goes straight into the cart item; the expired notice is gone.
    const next = await day.locator("option").nth(1).getAttribute("value");
    await day.selectOption(next!);
    await expect(drawer.locator("[data-testid=cart-line-delivery][data-issue=expired]")).toHaveCount(0);
    const stored = await page.evaluate(() => (JSON.parse(localStorage.getItem("blumora-cart") ?? "{}") as { state: { items: { deliveryDate?: string }[] } }).state.items[0]?.deliveryDate);
    expect(stored).toBe(next);
    expect(stripeErrors()).toEqual([]);
  });

  test("cart page: checkout button only – no express block", async ({ page }) => {
    test.slow();
    test.skip(!publishableKey, "public publishable key not reachable");
    const stripeErrors = collectStripeErrors(page);
    await interceptPayments(page);
    await addAmourToCart(page);
    await gotoPage(page, "/warenkorb");
    const main = page.getByRole("main");
    await expect(main.getByRole("article", { name: /Amour, Large/ })).toBeVisible();
    await expect(main.getByRole("link", { name: /Sicher zur Kasse/ })).toBeVisible();
    await expect(main.getByTestId("express-buy")).toHaveCount(0);
    await noHorizontalOverflow(page);
    expect(stripeErrors()).toEqual([]);
    await page.screenshot({ path: "test-results/cart-page-390.png", fullPage: true });
  });
});
