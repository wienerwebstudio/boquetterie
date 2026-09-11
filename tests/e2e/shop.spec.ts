import { expect, test } from "@playwright/test";
import { gotoPage } from "./helpers";

/** Products that carry the colour "rosa" in content/products.json. */
const ROSA = ["Blush", "Pavlova", "Petit", "Sakura", "Rose Garden", "Confetti"];

test.describe("Shop-Listing", () => {
  test("?farbe=rosa zeigt nur passende Sträuße und den Filter-Chip", async ({ page }) => {
    await gotoPage(page, "/blumen?farbe=rosa");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const cards = page.getByRole("main").getByRole("article");
    await expect(cards.first()).toBeVisible();
    const names = await cards.getByRole("heading", { level: 3 }).allTextContents();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(ROSA).toContain(name.trim());
    expect(names).not.toContain("Amour");

    await expect(page.getByRole("button", { name: "Filter entfernen: Rosa" })).toBeVisible();
    await expect(page.getByText(`${names.length} Sträuße`)).toBeVisible();
  });

  test("Filter-Chip entfernen zeigt wieder alle Sträuße", async ({ page }) => {
    await gotoPage(page, "/blumen?farbe=rosa");
    const cards = page.getByRole("main").getByRole("article");
    const filtered = await cards.count();
    await page.getByRole("button", { name: "Filter entfernen: Rosa" }).click();
    await expect(page).toHaveURL(/\/blumen$/);
    await expect.poll(() => cards.count()).toBeGreaterThan(filtered);
  });

  test.describe("mobil (390px)", () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    test("öffnet das Filter-Sheet", async ({ page }) => {
      await gotoPage(page, "/blumen");
      const trigger = page.getByRole("button", { name: /^Filter/ });
      await expect(trigger).toBeVisible();
      await trigger.click();
      const sheet = page.getByRole("dialog", { name: "Filter" });
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole("button", { name: /Farbe/ })).toBeVisible();
      await sheet.getByRole("button", { name: "Schließen" }).click();
      await expect(sheet).toBeHidden();
    });
  });
});
