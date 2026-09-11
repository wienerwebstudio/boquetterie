import { expect, test } from "@playwright/test";
import { ADMIN_PASSWORD } from "./helpers";

test.describe("Admin", () => {
  test("ohne Anmeldung wird auf das Login umgeleitet", async ({ page }) => {
    await page.goto("/admin/bestellungen");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fbestellungen/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Verwaltung");
  });

  test("falsches Passwort wird abgelehnt", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel(/Passwort/).fill("definitely-wrong");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/admin\/login\?error=invalid/);
    await expect(page.getByText("Das Passwort ist nicht korrekt.")).toBeVisible();
  });

  test("Login mit ADMIN_PASSWORD erreicht das Dashboard", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.getByLabel(/Passwort/).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { level: 1, name: "Übersicht" })).toBeVisible();
    // Session cookie set – a direct visit no longer redirects.
    await page.goto("/admin/bestellungen");
    await expect(page).toHaveURL(/\/admin\/bestellungen$/);
  });
});
