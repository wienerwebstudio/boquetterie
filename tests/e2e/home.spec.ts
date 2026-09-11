import { expect, test } from "@playwright/test";
import { PLZ_NOT_SERVED, PLZ_SERVED, gotoPage } from "./helpers";

test.describe("Startseite", () => {
  test("rendert die Headline und die Lieferprüfung", async ({ page }) => {
    await gotoPage(page, "/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Blumen, die mehr sagen.");
    await expect(page.getByRole("form", { name: "Lieferprüfung" })).toBeVisible();
  });

  test("PLZ-Check: 1040 ist lieferbar", async ({ page }) => {
    await gotoPage(page, "/");
    const form = page.getByRole("form", { name: "Lieferprüfung" });
    await form.getByRole("textbox").fill(PLZ_SERVED);
    await form.getByRole("button", { name: "Lieferung prüfen" }).click();
    await expect(page.getByText(/Lieferung verfügbar/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Lieferdatum auswählen/ })).toHaveAttribute("href", `/blumen?plz=${PLZ_SERVED}`);
  });

  test("PLZ-Check: 8010 wird nicht beliefert", async ({ page }) => {
    await gotoPage(page, "/");
    const form = page.getByRole("form", { name: "Lieferprüfung" });
    await form.getByRole("textbox").fill(PLZ_NOT_SERVED);
    await form.getByRole("button", { name: "Lieferung prüfen" }).click();
    await expect(page.getByText(`Leider liefern wir an ${PLZ_NOT_SERVED} noch nicht.`)).toBeVisible();
    await expect(page.getByText(/Lieferung verfügbar/)).toHaveCount(0);
  });
});
