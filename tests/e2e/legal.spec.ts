import { expect, test } from "@playwright/test";
import { gotoPage } from "./helpers";

test.describe("Rechtliches", () => {
  for (const [path, heading, phrase] of [
    ["/agb", "Allgemeine Geschäftsbedingungen", "§ 18 Abs. 1 Z 4"],
    ["/datenschutz", "Datenschutzerklärung", "Stripe Payments Europe"],
    ["/widerruf", "Widerrufsbelehrung und Rücktrittsrecht", "Muster-Widerrufsformular"],
  ] as const) {
    test(`${heading}: echter Text, kein Platzhalter`, async ({ page }) => {
      await gotoPage(page, path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expect(page.locator("main")).toContainText(phrase);
      await expect(page.locator("main")).not.toContainText("Platzhalter");
      await expect(page.locator("main")).not.toContainText("wird gerade fertiggestellt");
    });
  }

  test("Vertrag widerrufen: Erklärung absenden, Eingangsbestätigung mit Datum und Uhrzeit", async ({ page }) => {
    await gotoPage(page, "/widerruf");
    await page.getByRole("link", { name: "Vertrag hier widerrufen" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vertrag widerrufen");

    await page.getByRole("button", { name: "Widerruf bestätigen" }).click();
    await expect(page.getByText("Bitte gib die Bestellnummer an")).toBeVisible();

    await page.getByLabel("Name").fill("Anna Test");
    await page.getByLabel("E-Mail-Adresse").fill("anna.test@example.com");
    await page.getByLabel("Bestellnummer").fill("BQ-TEST01");
    await page.getByLabel(/Welche Waren/).fill("den Teddy");
    await page.getByRole("button", { name: "Widerruf bestätigen" }).click();

    const status = page.getByRole("status").filter({ hasText: "Dein Widerruf ist eingegangen." });
    await expect(status).toBeVisible();
    await expect(status).toContainText(/Eingegangen am \d{2}\.\d{2}\.\d{4}, \d{2}:\d{2} Uhr/);
    await expect(status).toContainText("BQ-TEST01");
  });
});
