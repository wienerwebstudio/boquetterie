import { expect, test } from "@playwright/test";
import { gotoPage } from "./helpers";

test.describe("Newsletter Double-Opt-in", () => {
  test("Bestätigungsseite: erst ein Klick bestätigt, ungültiger Link wird erkannt", async ({ page }) => {
    await gotoPage(page, "/newsletter/bestaetigen?id=NL-UNBEKANNT&token=falsch");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Newsletter-Anmeldung bestätigen");
    await page.getByRole("button", { name: "Anmeldung bestätigen" }).click();
    await expect(page).toHaveURL(/\/newsletter\/bestaetigen\?status=invalid$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Link ungültig.");
  });

  test("Abmeldeseite ohne vollständigen Link ändert nichts", async ({ page }) => {
    await gotoPage(page, "/newsletter/abmelden");
    await expect(page.getByText("Dieser Link ist unvollständig.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Abmelden" })).toHaveCount(0);
  });
});
