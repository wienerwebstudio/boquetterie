import { expect, test } from "@playwright/test";
import { gotoPage } from "./helpers";

/** Phone fields: country-code select (default Austria +43), pasted international numbers switch the code. */
test("Telefonfeld mit Ländervorwahl (Standard +43)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoPage(page, "/firmenkunden");
  const code = page.getByRole("combobox", { name: "Ländervorwahl" });
  const number = page.getByLabel(/^Telefon/);
  await expect(code).toHaveValue("+43");
  await expect(code.locator("option").first()).toHaveText("Österreich (+43)");

  await number.fill("0049 30 123456");
  await expect(code).toHaveValue("+49");
  await expect(number).toHaveValue("30 123456");

  await code.selectOption("+41");
  await expect(number).toHaveValue("30 123456");
  await expect(page.getByText("CH", { exact: true })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await number.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/phone-input-390.png" });
});
