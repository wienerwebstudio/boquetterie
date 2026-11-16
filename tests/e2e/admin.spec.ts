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
    await page.locator("input#password").fill("definitely-wrong");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/admin\/login\?error=invalid/);
    await expect(page.getByText("Das Passwort ist nicht korrekt.")).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Das Passwort ist nicht korrekt." })).toContainText(/Noch \d Versuche?/);
  });

  test("Passwort lässt sich zum Prüfen anzeigen", async ({ page }) => {
    await page.goto("/admin/login");
    const input = page.locator("input#password");
    await expect(input).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Passwort anzeigen" }).click();
    await expect(input).toHaveAttribute("type", "text");
  });

  test("Login mit ADMIN_PASSWORD erreicht das Dashboard", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.locator("input#password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { level: 1, name: "Übersicht" })).toBeVisible();
    // Session cookie set – a direct visit no longer redirects.
    await page.goto("/admin/bestellungen");
    await expect(page).toHaveURL(/\/admin\/bestellungen$/);

    // Test mails: a recipient can be typed in; without a mail provider the admin is told so.
    await page.goto("/admin");
    await page.getByLabel(/Empfänger/).fill("test-empfaenger@example.com");
    await page.getByRole("button", { name: "Test-Mails senden" }).click();
    await expect(page.getByRole("status").filter({ hasText: /Kein Mailversand eingerichtet|gesendet/ })).toBeVisible();
  });
});
