import { expect, test } from "@playwright/test";
import { addAmourToCart } from "./helpers";

test.describe("Produktseite", () => {
  test("Konfiguration: Large, PLZ, Datum, Nachricht → Warenkorb-Drawer", async ({ page }) => {
    await addAmourToCart(page, { message: "Alles Liebe aus dem Test" });

    const drawer = page.getByRole("dialog", { name: /Warenkorb/ });
    const line = drawer.getByRole("article", { name: /Amour, Large/ });
    await expect(line).toContainText("Large");
    await expect(line).toContainText("Lieferung");
    await expect(line).toContainText("1040");
    await expect(line).toContainText("Alles Liebe aus dem Test");
    await expect(line).toContainText("89,90");
    await expect(page.getByRole("button", { name: /Warenkorb, 1 Artikel/ })).toBeVisible();
  });
});
