import { expect, test } from "@playwright/test";
import { addAmourToCart, gotoPage } from "./helpers";

test.describe("Produktseite", () => {
  test("Konfiguration: Large, PLZ, Datum → Warenkorb-Drawer; Grußkarte kommt bald", async ({ page }) => {
    await gotoPage(page, "/produkt/amour");
    const card = page.getByRole("region", { name: "Persönliche Grußkarte" });
    await expect(card).toContainText("Kommt bald!");
    await expect(page.getByRole("button", { name: /Persönliche Nachricht hinzufügen/ })).toHaveCount(0);

    await addAmourToCart(page);

    const drawer = page.getByRole("dialog", { name: /Warenkorb/ });
    const line = drawer.getByRole("article", { name: /Amour, Large/ });
    await expect(line).toContainText("Large");
    await expect(line).toContainText("Lieferung");
    await expect(line).toContainText("1040");
    await expect(page.getByRole("dialog", { name: /Warenkorb/ })).toContainText("Grußkarten kommen bald");
    await expect(line).toContainText("89,90");
    await expect(page.getByRole("button", { name: /Warenkorb, 1 Artikel/ })).toBeVisible();
  });
});
