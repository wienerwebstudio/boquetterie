import { expect, test } from "@playwright/test";
import { ADMIN_PASSWORD, dismissConsent } from "./helpers";

/**
 * Individual offer, end to end with the mock payment provider:
 * the team writes an offer (pink tulips to a meeting point) → the customer opens the
 * private link → accepts the terms and pays → the order is paid in the admin and the
 * offer shows "Bezahlt".
 */
test.describe("Angebote @slow", () => {
  test("Angebot anlegen, per Link bezahlen, Bestellung ist bezahlt", async ({ page }) => {
    test.slow();
    const day = new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10);

    await page.goto("/admin/login?next=%2Fadmin%2Fangebote%2Fneu");
    await page.locator("input#password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/admin\/angebote\/neu$/);
    await expect(page.getByRole("heading", { level: 1, name: "Neues Angebot" })).toBeVisible();

    await page.locator("#c-first").fill("Mei");
    await page.locator("#c-last").fill("Lin");
    await page.locator("#c-email").fill("mei.lin@example.com");
    await page.locator("#c-locale").selectOption("en");
    await page.locator("[id^='items.0-title']").fill("Bouquet of pink tulips");
    await page.locator("[id^='items.0-desc']").fill("About 30 pink tulips, nothing else");
    await page.locator("[id^='items.0-price']").fill("79");
    await page.locator("#d-date").fill(day);
    await page.locator("#d-from").fill("14:00");
    await page.locator("#d-to").fill("16:00");
    await page.getByRole("radio", { name: "Treffpunkt" }).click();
    await page.locator("#r-street").fill("Universitätsring");
    await page.locator("#r-no").fill("2");
    await page.locator("#r-add").fill("Haupteingang Burgtheater");
    await page.locator("#r-zip").fill("1010");
    await page.locator("#r-first").fill("Mei");
    await page.locator("#r-phone").fill("+886 912 345 678");
    // Delivery fee comes from the zone of the ZIP (fixture: Wien Zentrum 7,90 €).
    await expect(page.getByTestId("offer-form-total")).toHaveText(/86,90/);

    await page.getByRole("button", { name: "Speichern & senden" }).click();
    await expect(page).toHaveURL(/\/admin\/angebote\/AN-[A-Z0-9]+\?gesendet=1/, { timeout: 30_000 });
    await expect(page.getByText("Gesendet", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Link kopieren" }).click();
    const linkField = page.getByLabel("Link zum Angebot");
    await expect(linkField).toBeVisible();
    const link = await linkField.inputValue();
    expect(link).toMatch(/\/en\/angebot\/[A-Za-z0-9_-]{32}$/);
    const offerUrl = page.url().split("?")[0];

    /* ---- Customer ---- */
    await page.goto(new URL(link).pathname);
    await dismissConsent(page);
    await expect(page.getByRole("heading", { level: 1, name: "Your personal offer" })).toBeVisible();
    await expect(page.getByText("Bouquet of pink tulips")).toBeVisible();
    await expect(page.getByText("Haupteingang Burgtheater")).toBeVisible();
    await expect(page.getByTestId("offer-total")).toContainText("86.90");

    const card = page.getByRole("radio", { name: /Credit card|Kreditkarte/ });
    await expect(async () => {
      await page.locator("label", { hasText: /Credit card|Kreditkarte/ }).first().click();
      await expect(card).toBeChecked({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    // Without the terms nothing happens.
    await page.getByRole("button", { name: /Pay now/ }).click();
    await expect(page.getByText("Please accept the terms and conditions.")).toBeVisible();
    await page.getByRole("checkbox", { name: /terms and conditions/ }).check();
    await page.getByRole("button", { name: /Pay now/ }).click();

    await expect(page).toHaveURL(/\/en\/bestellung\/BQ-[A-Z0-9]+\?token=/, { timeout: 30_000 });
    const orderId = page.url().match(/BQ-[A-Z0-9]+/)?.[0] ?? "";

    /* ---- Admin: offer paid, order paid ---- */
    await page.goto(offerUrl);
    await expect(page.getByText("Bezahlt", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: orderId })).toBeVisible();

    await page.goto(`/admin/bestellungen?q=${orderId}`);
    const row = page.getByRole("row", { name: new RegExp(orderId) });
    await expect(row).toContainText("Bezahlt");
    await expect(row).toContainText("86,90");

    await page.goto(`/admin/bestellungen/${orderId}`);
    await expect(page.getByText(/Individuelles Angebot/).first()).toBeVisible();
    await expect(page.getByText("About 30 pink tulips, nothing else")).toBeVisible();

    // Paying twice is impossible: the link now only says "already paid".
    await page.goto(new URL(link).pathname);
    await expect(page.getByRole("heading", { level: 1, name: "Thank you – already paid" })).toBeVisible();
  });

  test("Entwurf: Link aus der Test-Mail zeigt eine Vorschau, Bezahlen ist gesperrt", async ({ page }) => {
    test.slow();
    const day = new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10);
    await page.goto("/admin/login?next=%2Fadmin%2Fangebote%2Fneu");
    await page.locator("input#password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/admin\/angebote\/neu$/);

    await page.locator("#c-first").fill("Vera");
    await page.locator("#c-last").fill("Vorschau");
    await page.locator("#c-email").fill("vera.vorschau@example.com");
    await page.locator("[id^='items.0-title']").fill("Strauß zur Vorschau");
    await page.locator("[id^='items.0-price']").fill("50");
    await page.locator("#d-date").fill(day);
    await page.locator("#r-street").fill("Universitätsring");
    await page.locator("#r-no").fill("2");
    await page.locator("#r-zip").fill("1010");
    await page.locator("#r-first").fill("Vera");
    await page.getByRole("button", { name: "Als Entwurf speichern" }).click();
    await expect(page).toHaveURL(/\/admin\/angebote\/AN-[A-Z0-9]+(\?|$)/, { timeout: 30_000 });

    const preview = page.getByRole("link", { name: "Vorschau ansehen" });
    await expect(preview).toBeVisible();
    const href = (await preview.getAttribute("href")) ?? "";
    const token = href.split("/").pop() ?? "";
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);

    await page.goto(new URL(href, page.url()).pathname);
    await dismissConsent(page);
    await expect(page.getByRole("heading", { level: 1, name: "Dein persönliches Angebot" })).toBeVisible();
    await expect(page.getByText("Strauß zur Vorschau")).toBeVisible();
    await expect(page.getByTestId("offer-preview")).toContainText("Vorschau – noch nicht versendet");
    await expect(page.getByRole("button", { name: /Jetzt bezahlen|Pay now/ })).toHaveCount(0);

    // The server refuses to start a payment for a draft, whatever the browser sends.
    const res = await page.request.post("/api/offers/pay", { data: { token, method: "card", acceptedTerms: true } });
    expect(res.ok()).toBe(false);
  });

  test("Extern bezahlt: Angebot im Admin als bezahlt markieren", async ({ page }) => {
    test.slow();
    const day = new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10);
    await page.goto("/admin/login?next=%2Fadmin%2Fangebote%2Fneu");
    await page.locator("input#password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/admin\/angebote\/neu$/);
    await page.locator("#c-first").fill("Lea");
    await page.locator("#c-last").fill("Berger");
    await page.locator("#c-email").fill("lea.berger@example.com");
    await page.locator("[id^='items.0-title']").fill("Strauß nach Wunsch");
    await page.locator("[id^='items.0-price']").fill("60");
    await page.locator("#d-date").fill(day);
    await page.locator("#d-from").fill("10:00");
    await page.locator("#d-to").fill("12:00");
    await page.locator("#r-street").fill("Wiedner Hauptstraße");
    await page.locator("#r-no").fill("12");
    await page.locator("#r-zip").fill("1040");
    await page.locator("#r-first").fill("Lea");
    await page.locator("#r-phone").fill("+43 664 1234567");
    await page.getByRole("button", { name: "Speichern & senden" }).click();
    await expect(page).toHaveURL(/\/admin\/angebote\/AN-[A-Z0-9]+\?gesendet=1/, { timeout: 30_000 });

    await page.getByRole("button", { name: /Extern bezahlt/ }).click();
    await page.getByLabel("Zahlungs-ID (optional)").fill("pi_test_external");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Als bezahlt markieren" }).click();
    await expect(page.getByText(/Als bezahlt markiert – Bestellung BQ-/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Bezahlt", { exact: true }).first()).toBeVisible();
    await page.getByRole("link", { name: "Zur Bestellung" }).first().click();
    await expect(page).toHaveURL(/\/admin\/bestellungen\/BQ-/);
    await expect(page.getByText("pi_test_external", { exact: true })).toBeVisible();

    // Individual item without budget: shown as missing, then entered in the order.
    await expect(page.getByTestId("line-budget")).toHaveText("Partner-Budget: nicht hinterlegt");
    await expect(page.getByTestId("order-budget")).toHaveText("nicht hinterlegt");
    await page.getByLabel(/Strauß nach Wunsch – pro Stück/).fill("30");
    await page.getByRole("button", { name: "Budget speichern" }).click();
    await expect(page.getByText(/Budget gespeichert/)).toBeVisible();
    await expect(page.getByTestId("order-budget")).toHaveText(/30,00/);
    await expect(page.getByTestId("line-budget")).toHaveText(/Partner-Budget: €\s30,00/);
    await page.goto("/admin/bestellungen");
    await expect(page.getByRole("columnheader", { name: "Budget" })).toBeVisible();
  });
});
