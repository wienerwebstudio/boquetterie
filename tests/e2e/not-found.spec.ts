import { expect, test } from "@playwright/test";

test("unbekanntes Produkt liefert 404", async ({ page }) => {
  const response = await page.goto("/produkt/nope");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Diese Seite ist verblüht.");
  await expect(page.getByRole("link", { name: "Zur Startseite" })).toBeVisible();
});
