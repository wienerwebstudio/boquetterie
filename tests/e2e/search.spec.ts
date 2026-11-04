import { expect, test } from "@playwright/test";
import { gotoPage } from "./helpers";

test.describe("Suche", () => {
  test("Overlay öffnet sich und „mama“ liefert Sträuße und den Anlass Danke", async ({ page }) => {
    await gotoPage(page, "/");
    await page.getByRole("button", { name: "Suche" }).click();
    const dialog = page.getByRole("dialog", { name: "Suche" });
    await expect(dialog).toBeVisible();

    const input = dialog.getByRole("searchbox", { name: "Suchbegriff" });
    await expect(input).toBeFocused();
    await input.fill("mama");

    await expect(dialog.getByRole("link", { name: /Blush/ })).toBeVisible();
    await expect(dialog.getByRole("link", { name: /^Danke$/ })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Alle Ergebnisse" })).toHaveAttribute("href", "/suche?q=mama");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
