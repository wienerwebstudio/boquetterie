import { expect, test } from "@playwright/test";
import { PLZ_SERVED, addAmourToCart, gotoPage } from "./helpers";

type Day = { date: string; sameDay: boolean; windows: { id: string; surcharge: number }[] };

/** Vienna "today" as YYYY-MM-DD. */
const viennaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vienna" }).format(new Date());

/**
 * Express badge on today's earliest window. The delivery check answers with the real zone,
 * but today is forced to be a same-day day with afternoon windows – independent of the time
 * the test runs.
 */
test("Kasse: frühestes Zeitfenster heute ist als Express markiert (ohne Aufpreis)", async ({ page }) => {
  test.slow();
  await page.route("**/api/delivery/check**", async (route) => {
    const res = await route.fetch();
    const body = (await res.json()) as { ok: boolean; zone?: { windows: { id: string; surcharge: number; active?: boolean }[] }; days?: Day[] };
    if (body.ok && body.zone && body.days) {
      const today = viennaToday();
      const windows = body.zone.windows.filter((w) => w.active !== false).slice(-5);
      body.days = [{ date: today, sameDay: true, windows }, ...body.days.filter((d) => d.date !== today)];
    }
    await route.fulfill({ response: res, json: body });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await addAmourToCart(page);
  await gotoPage(page, "/checkout");
  await page.getByLabel("Vorname").fill("Anna");
  await page.getByLabel("Nachname").fill("Huber");
  await page.getByLabel("Straße").fill("Wiedner Hauptstraße");
  await page.getByLabel("Hausnummer").fill("12");
  const zip = page.getByLabel("PLZ");
  if ((await zip.inputValue()) !== PLZ_SERVED) await zip.fill(PLZ_SERVED);
  await page.getByLabel("Telefonnummer für die Zustellung").fill("0664 1234567");
  await expect(page.getByText(/Lieferung möglich/)).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();

  const dates = page.getByRole("radiogroup", { name: "Lieferdatum" });
  await dates.locator("label").first().click();
  await expect(page.getByText(/noch heute/)).toBeVisible();
  const windows = page.getByRole("radiogroup", { name: "Lieferzeitfenster" });
  const badge = page.getByTestId("express-badge");
  await expect(badge).toHaveCount(1);
  await expect(badge).toHaveText("Express");
  // The badge sits on the first (earliest) window.
  await expect(windows.locator("label").first().getByTestId("express-badge")).toHaveCount(1);
  await expect(page.getByTestId("express-hint")).toHaveText("Express: Express-Lieferung in 1–2 Stunden – ohne Aufpreis.");
  await windows.locator("label").first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/express-window-390.png" });

  // Another day: no express.
  await dates.locator("label").nth(1).click();
  await expect(badge).toHaveCount(0);
  await expect(page.getByTestId("express-hint")).toHaveCount(0);
});
