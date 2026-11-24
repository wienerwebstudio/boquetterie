import { expect, test } from "@playwright/test";
import { ADMIN_PASSWORD } from "./helpers";

/** Admin → Analytics: login required; all six dashboards and the period switch render. */
test("Analytics-Dashboards (sechs Reiter)", async ({ page, playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL });
  const res = await anon.get("/admin/analytics", { maxRedirects: 0 });
  expect([307, 308]).toContain(res.status());
  expect(res.headers()["location"]).toContain("/admin/login");
  await anon.dispose();

  await page.goto("/admin/login?next=%2Fadmin%2Fanalytics");
  await page.locator("input#password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/admin\/analytics$/);
  await expect(page.getByRole("heading", { level: 1, name: "Analytics" })).toBeVisible();
  await expect(page.getByTestId("analytics-ceo")).toContainText("Umsatz pro Tag");

  const tabs: [string, string, string][] = [
    ["Marketing & Attribution", "marketing", "Kanäle"],
    ["Checkout & Conversion", "checkout", "Zahlarten"],
    ["Internationalisierung", "i18n", "Umsatz pro Shop-Sprache"],
    ["Produktperformance", "produkte", "Größen"],
    ["Lieferungen & Operations", "lieferung", "Pünktlich"],
  ];
  const nav = page.getByRole("navigation", { name: "Dashboards" });
  for (const [label, id, text] of tabs) {
    await nav.getByRole("link", { name: label }).click();
    await expect(page.getByTestId(`analytics-${id}`)).toContainText(text);
  }
  await page.getByRole("navigation", { name: "Zeitraum" }).getByRole("link", { name: "Gesamt" }).click();
  await expect(page).toHaveURL(/tab=lieferung&range=all/);
  await expect(page.getByTestId("analytics-lieferung")).toBeVisible();
});
