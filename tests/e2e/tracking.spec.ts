import { expect, test, type Page } from "@playwright/test";
import { PLZ_SERVED, addAmourToCart, gotoPage } from "./helpers";

/**
 * Analytics events with statistics consent: a stub `window.umami` records every `track()` call
 * (the real script is not loaded in tests). Checks the main funnel events and that the order
 * carries the channel of the visit and the visitor id (for the server-side `purchase`).
 */
type Ev = [string, Record<string, unknown> | undefined];

async function withConsentAndUmamiStub(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("bl-consent", JSON.stringify({ necessary: true, analytics: true, marketing: false, version: 2, updatedAt: new Date().toISOString() }));
    const w = window as unknown as { __ev: unknown[]; umami: { track: (n: string, d?: unknown) => void } };
    w.__ev = [];
    w.umami = { track: (n, d) => { w.__ev.push([n, d]); } };
  });
}
const events = (page: Page) => page.evaluate(() => (window as unknown as { __ev: Ev[] }).__ev);
const names = async (page: Page) => (await events(page)).map((e) => e[0]);

test("Tracking: Produkt → Warenkorb → Kasse, Bestellung trägt Kanal und Besucher-ID", async ({ page }) => {
  test.slow();
  await withConsentAndUmamiStub(page);
  // The visit comes from ChatGPT (utm_source as ChatGPT sets it).
  await gotoPage(page, "/?utm_source=chatgpt.com");
  await addAmourToCart(page);
  await expect.poll(() => names(page)).toEqual(expect.arrayContaining(["view_item", "select_variant", "postcode_checked", "add_to_cart"]));
  const all = await events(page);
  const add = all.find((e) => e[0] === "add_to_cart")?.[1];
  expect(add).toMatchObject({ product_id: expect.any(String), size: expect.any(String), quantity: 1 });
  expect(typeof add?.value).toBe("number");
  // No personal data in any event.
  expect(JSON.stringify(all)).not.toMatch(/@|1040|Wiedner/);

  await page.getByRole("dialog", { name: /Warenkorb/ }).getByRole("link", { name: /Sicher zur Kasse/ }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect.poll(() => names(page)).toContain("begin_checkout");

  // Step 1
  await page.getByLabel("Vorname").fill("Anna");
  await page.getByLabel("Nachname").fill("Huber");
  await page.getByLabel("Straße").fill("Wiedner Hauptstraße");
  await page.getByLabel("Hausnummer").fill("12");
  const zip = page.getByLabel("PLZ");
  if ((await zip.inputValue()) !== PLZ_SERVED) await zip.fill(PLZ_SERVED);
  await page.getByLabel("Telefonnummer für die Zustellung").fill("0664 1234567");
  await expect(page.getByText(/Lieferung möglich/)).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect.poll(() => names(page)).toEqual(expect.arrayContaining(["address_completed", "delivery_fee_shown"]));

  // Step 2
  const dates = page.getByRole("radiogroup", { name: "Lieferdatum" });
  if (!(await dates.getByRole("radio").first().isChecked())) await dates.locator("label").first().click();
  const windows = page.getByRole("radiogroup", { name: "Lieferzeitfenster" });
  await windows.locator("label").first().click();
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect.poll(() => names(page)).toContain("delivery_slot_selected");
  const slot = (await events(page)).find((e) => e[0] === "delivery_slot_selected")?.[1];
  expect(["express", "same_day", "scheduled"]).toContain(slot?.slot_type);

  // Step 3 + 4
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByLabel("Vorname").fill("Paul");
  await page.getByLabel("Nachname").fill("Maier");
  await page.getByLabel("E-Mail-Adresse").fill("paul.maier@example.com");
  await page.getByRole("textbox", { name: "Telefon", exact: true }).fill("0664 7654321");
  await page.getByRole("checkbox", { name: /AGB/ }).check();
  await page.getByRole("button", { name: "Weiter" }).click();

  // Step 5 (mock payment): the order request carries channel + visitor id.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fast geschafft");
  const mockCard = page.getByRole("radio", { name: /Kreditkarte/ });
  await expect(async () => {
    await page.locator("label", { hasText: "Kreditkarte" }).click();
    await expect(mockCard).toBeChecked({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await expect.poll(() => names(page)).toContain("payment_method_selected");
  const orderReq = page.waitForRequest((r) => r.url().endsWith("/api/orders") && r.method() === "POST");
  await page.getByRole("button", { name: /Jetzt kaufen/ }).click();
  const body = (await orderReq).postDataJSON() as { analytics?: { visitorId?: string; attribution?: { channel?: string; landing?: string } }; delivery?: { express?: boolean } };
  expect(body.analytics?.attribution?.channel).toBe("chatgpt");
  expect(body.analytics?.attribution?.landing).toBe("/");
  expect(body.analytics?.visitorId).toMatch(/^[a-f0-9-]{16,40}$/);
  expect(typeof body.delivery?.express).toBe("boolean");
  await expect(page).toHaveURL(/\/bestellung\/BQ-[A-Z0-9]+\?token=/, { timeout: 30_000 });
});

test("Tracking: ohne Zustimmung keine Events und keine Besucher-ID", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("bl-consent", JSON.stringify({ necessary: true, analytics: false, marketing: false, version: 2, updatedAt: new Date().toISOString() }));
    const w = window as unknown as { __ev: unknown[]; umami: { track: (n: string, d?: unknown) => void } };
    w.__ev = [];
    w.umami = { track: (n, d) => { w.__ev.push([n, d]); } };
  });
  await gotoPage(page, "/produkt/amour");
  await expect(page.getByRole("heading", { level: 1, name: "Amour" })).toBeVisible();
  await page.waitForTimeout(500);
  expect(await events(page)).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("bl-visit"))).toBeNull();
});
