import { expect, test, type Browser, type Page } from "@playwright/test";
import { ADMIN_PASSWORD, PLZ_SERVED, addAmourToCart } from "./helpers";

/**
 * "Abgebrochene Kasse": a customer who filled steps 1–4 and stopped at the payment step
 * shows up in the admin (Bestellungen → Abgebrochene Kasse) with her contact data; once
 * the same session places the order (mock payment), the entry is gone.
 */
async function adminPage(browser: Browser) {
  const context = await browser.newContext();
  const admin = await context.newPage();
  await admin.goto("/admin/login?next=%2Fadmin%2Fbestellungen");
  await admin.locator("input#password").fill(ADMIN_PASSWORD);
  await admin.getByRole("button", { name: "Anmelden" }).click();
  await expect(admin).toHaveURL(/\/admin\/bestellungen/);
  return { admin, close: () => context.close() };
}

async function fillUntilPayment(page: Page, email: string) {
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
  await expect(dates.getByRole("radio").first()).toBeAttached();
  if (!(await dates.getByRole("radio").first().isChecked())) await dates.locator("label").first().click();
  await page.getByRole("radiogroup", { name: "Lieferzeitfenster" }).locator("label").first().click();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Deine Kontaktdaten");
  await page.getByLabel("Vorname").fill("Paula");
  await page.getByLabel("Nachname").fill("Abbruch");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByRole("textbox", { name: "Telefon", exact: true }).fill("0664 7654321");
  await page.getByRole("checkbox", { name: /AGB/ }).check();
  const snapshot = page.waitForResponse((r) => r.url().includes("/api/checkout/draft") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fast geschafft");
  expect((await snapshot).status()).toBe(200);
}

test.describe("Abgebrochene Kasse @slow", () => {
  test("Kontaktdaten aus Schritt 4 erscheinen im Admin, nach der Bestellung ist der Eintrag weg", async ({ page, browser }) => {
    test.slow();
    const email = `abbruch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
    await fillUntilPayment(page, email);

    const { admin, close } = await adminPage(browser);
    try {
      await admin.goto("/admin/bestellungen?status=abandoned");
      const row = admin.getByTestId("abandoned-checkout").filter({ hasText: email });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText("Paula Abbruch");
      await expect(row).toContainText("+43 664 7654321");
      await expect(row).toContainText("Amour");
      await expect(row).toContainText("Wiedner Hauptstraße 12");
      await expect(row).toContainText(/€/);

      /* ---- The customer completes the order (mock payment) ---- */
      const mockCard = page.getByRole("radio", { name: /Kreditkarte/ });
      await expect(async () => {
        await page.locator("label", { hasText: "Kreditkarte" }).click();
        await expect(mockCard).toBeChecked({ timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
      await page.getByRole("button", { name: /Jetzt kaufen/ }).click();
      await expect(page).toHaveURL(/\/bestellung\/BQ-[A-Z0-9]+\?token=/, { timeout: 30_000 });

      await expect(async () => {
        await admin.goto("/admin/bestellungen?status=abandoned");
        await expect(admin.getByTestId("abandoned-checkout").filter({ hasText: email })).toHaveCount(0, { timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
      // …and the order itself is in the list.
      await admin.goto(`/admin/bestellungen?q=${encodeURIComponent(email)}`);
      await expect(admin.getByRole("row").filter({ hasText: email })).toHaveCount(1);
    } finally {
      await close();
    }
  });
});
