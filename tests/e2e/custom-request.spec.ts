import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PASSWORD, gotoPage } from "./helpers";

/**
 * Page "Anfrage" (docs/INQUIRIES.md): a customer sends a delivery question with a photo →
 * success state → the team sees it in admin → Anfragen, changes the status and creates a
 * prefilled offer, which is then linked to the request. Plus the mobile-menu entry and
 * header widths. Screenshots (390 px) land in test-results/custom-request/.
 */
const PHOTO = path.join(process.cwd(), "tests/fixtures/media/inspiration.jpg");
const SHOTS = path.join(process.cwd(), "test-results/custom-request");
const day = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);

async function noHorizontalOverflow(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll).toBeLessThanOrEqual(client);
}

test.describe("Anfrage @slow", () => {
  test("Anfrage mit Foto (de) → Admin: Status, Angebot vorausgefüllt und verknüpft", async ({ page, request }) => {
    test.slow();
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoPage(page, "/anfrage?produkt=amour");
    await expect(page.getByRole("heading", { level: 1, name: "Sonderwunsch oder Frage zur Lieferung?" })).toBeVisible();
    await expect(page.getByText("frag uns, wir melden uns mit einer Antwort.")).toBeVisible();
    // Opened from a product: product and topic are preselected.
    await expect(page.getByLabel("Strauß aus dem Shop", { exact: true })).toHaveValue("amour");
    await expect(page.getByRole("checkbox", { name: "Bestimmter Strauß aus dem Shop" })).toBeChecked();

    // Client validation.
    await page.getByRole("button", { name: "Anfrage senden" }).click();
    await expect(page.getByText("Bitte gib deinen Namen an.")).toBeVisible();
    await expect(page.getByText("Bitte beschreib deine Frage (mindestens 10 Zeichen).")).toBeVisible();
    await expect(page.getByText("Bitte bestätige, dass wir deine Angaben zur Bearbeitung verwenden dürfen.")).toBeVisible();

    // Budget only for larger orders / own designs.
    await expect(page.getByLabel(/^Budget/)).toHaveCount(0);
    await page.getByText("Größere Bestellung / Firma").click();
    await page.getByText("Bestimmte Uhrzeit", { exact: true }).click();
    await page.getByLabel(/^Budget/).selectOption("b100");

    await page.getByLabel(/^Wunschtermin/).fill(day);
    await page.getByLabel(/^Uhrzeit/).fill("14–16 Uhr");
    await page.getByLabel(/^Lieferort/).fill("Christkindlmarkt Rathausplatz, Stand 12");
    await page.getByLabel(/^Deine Frage/).fill("Könnt ihr den Strauß direkt an unseren Stand liefern? Gern in Rot und Weiß.");
    await page.getByTestId("request-photo-input").setInputFiles(PHOTO);
    await expect(page.getByRole("button", { name: "Foto entfernen" })).toBeVisible();
    await page.getByLabel(/^Name/).fill("Anna Maria Huber");
    await page.getByLabel(/^E-Mail/).fill("anna.huber@example.com");
    // Country code: Austria by default, accessible select next to the number.
    await expect(page.getByRole("combobox", { name: "Ländervorwahl" })).toHaveValue("+43");
    await page.getByLabel(/^Telefon/).fill("0664 1234567");
    await page.getByRole("checkbox", { name: /Ich bin einverstanden/ }).check();
    await expect(page.getByRole("link", { name: "Datenschutzerklärung" })).toHaveAttribute("href", "/datenschutz");
    await noHorizontalOverflow(page);
    await page.screenshot({ path: `${SHOTS}/01-form-de-390.png`, fullPage: true });

    await page.getByRole("button", { name: "Anfrage senden" }).click();
    const success = page.getByTestId("request-success");
    await expect(success).toBeVisible({ timeout: 20_000 });
    await expect(success.getByRole("heading", { name: "Danke für deine Anfrage!" })).toBeVisible();
    const text = await success.innerText();
    const id = /AF-[A-Z0-9]{6}/.exec(text)?.[0];
    expect(id, text).toBeTruthy();
    expect(text).toContain("anna.huber@example.com");
    expect(text).not.toMatch(/Angebot/);
    await page.screenshot({ path: `${SHOTS}/02-success-de-390.png` });

    /* ---- Admin ---- */
    await page.goto("/admin/login?next=%2Fadmin%2Fanfragen");
    await page.locator("input#password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/admin\/anfragen$/);
    await expect(page.getByRole("heading", { level: 1, name: "Anfragen" })).toBeVisible();
    const row = page.getByTestId("inbox-row").filter({ hasText: id! });
    await expect(row).toBeVisible();
    await expect(row.getByText("Anfrage", { exact: true })).toBeVisible();
    await expect(row.getByText("Bestimmte Uhrzeit")).toBeVisible();
    await expect(row.getByText("Neu", { exact: true })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/03-admin-list-390.png`, fullPage: true });

    await row.getByRole("link", { name: id! }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/anfragen/${id}$`));
    const topics = page.getByTestId("request-topics");
    for (const t of ["Bestimmte Uhrzeit", "Bestimmter Strauß aus dem Shop", "Größere Bestellung / Firma"]) await expect(topics.getByText(t)).toBeVisible();
    await expect(page.getByText("Christkindlmarkt Rathausplatz, Stand 12")).toBeVisible();
    await expect(page.getByText("50–100 €")).toBeVisible();
    await expect(page.getByRole("link", { name: "Amour" })).toBeVisible();
    await expect(page.getByTestId("whatsapp-link")).toHaveAttribute("href", "https://wa.me/436641234567");
    const photo = page.getByTestId("request-photo");
    await expect(photo).toBeVisible();
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0);
    // Private: without the admin session the photo is not served.
    const src = await photo.getAttribute("src");
    expect(src).toMatch(/^\/media\/anfragen\//);
    const anonymous = await request.get(src!);
    expect(anonymous.status()).toBe(404);

    await page.locator("#req-status").selectOption("answered");
    await page.locator("#req-note").fill("Per Mail geantwortet, Stand passt.");
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(page.getByText("Gespeichert.")).toBeVisible();
    await expect(page.getByText("Beantwortet", { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/04-admin-detail-390.png`, fullPage: true });

    /* ---- Prefilled offer ---- */
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("link", { name: "Angebot erstellen" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/angebote/neu\\?anfrage=${id}$`));
    await expect(page.getByText(`Vorausgefüllt aus Anfrage ${id}`)).toBeVisible();
    await expect(page.locator("#c-first")).toHaveValue("Anna Maria");
    await expect(page.locator("#c-last")).toHaveValue("Huber");
    await expect(page.locator("#c-email")).toHaveValue("anna.huber@example.com");
    await expect(page.locator("#c-phone")).toHaveValue("+43 664 1234567");
    await expect(page.locator("#c-locale")).toHaveValue("de");
    await expect(page.locator("[id='items.0-product']")).toHaveValue("p-amour");
    await expect(page.locator("#d-date")).toHaveValue(day);
    await expect(page.locator("#d-from")).toHaveValue("14:00");
    await expect(page.locator("#d-to")).toHaveValue("16:00");
    await expect(page.getByRole("radio", { name: "Treffpunkt" })).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("#r-add")).toHaveValue("Christkindlmarkt Rathausplatz, Stand 12");
    await expect(page.locator("#r-first")).toHaveValue("Anna Maria");
    await expect(page.locator("#i-note")).toHaveValue(new RegExp(`Aus Anfrage ${id}[\\s\\S]*Budget: 50–100 €`));
    await expect(page.locator("#i-note")).toHaveValue(/Nachricht: Könnt ihr den Strauß/);

    await page.getByRole("button", { name: "Als Entwurf speichern" }).click();
    await expect(page).toHaveURL(/\/admin\/angebote\/AN-[A-Z0-9]+\?gespeichert=1/, { timeout: 30_000 });
    const offerId = /AN-[A-Z0-9]+/.exec(page.url())![0];
    await expect(page.getByRole("link", { name: `Anfrage ${id}` })).toBeVisible();

    await page.goto(`/admin/anfragen/${id}`);
    await expect(page.getByText("Angebot erstellt", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: `Angebot ${offerId}` })).toBeVisible();
  });

  test("Anfrage auf Arabisch (RTL) mit Foto", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoPage(page, "/ar/enquiry");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1, name: "رغبة خاصة أو سؤال عن التوصيل؟" })).toBeVisible();
    await page.getByText("وقت محدد", { exact: true }).click();
    await page.locator("input[name='time']").fill("7:00");
    await page.locator("textarea[name='message']").fill("هل يمكنكم التوصيل في الساعة السابعة صباحًا إلى الفندق؟");
    await page.getByTestId("request-photo-input").setInputFiles(PHOTO);
    await page.locator("input[name='name']").fill("Layla Haddad");
    await page.locator("input[name='email']").fill("layla@example.com");
    await page.locator("input[name='consent']").check();
    await noHorizontalOverflow(page);
    await page.getByRole("button", { name: "إرسال الطلب" }).click();
    const success = page.getByTestId("request-success");
    await expect(success).toBeVisible({ timeout: 20_000 });
    await expect(success.getByRole("heading", { name: "شكرًا على طلبك!" })).toBeVisible();
    await expect(success).toContainText(/AF-[A-Z0-9]{6}/);
    await noHorizontalOverflow(page);
    await page.screenshot({ path: `${SHOTS}/05-success-ar-390.png` });
  });

  test("Mobiles Menü: Eintrag „Anfrage stellen“, Header ohne Überlauf", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoPage(page, "/");
    await noHorizontalOverflow(page);
    await page.getByRole("button", { name: "Menü öffnen" }).click();
    const entry = page.getByTestId("mobile-custom-request");
    await expect(entry).toBeVisible();
    await expect(entry).toContainText("Anfrage stellen");
    await expect(entry).toContainText("Uhrzeit, Ort, Wunschstrauß");
    await expect(entry).toHaveAttribute("href", "/anfrage");
    await page.screenshot({ path: `${SHOTS}/06-mobile-menu-390.png` });
    await entry.click();
    await expect(page).toHaveURL(/\/anfrage$/);

    // Localized slug in another language.
    await gotoPage(page, "/en");
    await page.getByRole("button", { name: /menu/i }).click();
    await expect(page.getByTestId("mobile-custom-request")).toHaveAttribute("href", "/en/enquiry");

    // No new top-level desktop item: the header still fits at 1024 px (German and a long language).
    for (const path of ["/", "/ce", "/bks"]) {
      await page.setViewportSize({ width: 1024, height: 800 });
      await gotoPage(page, path);
      await noHorizontalOverflow(page);
      const fits = await page.locator("header > div").first().evaluate((el) => el.scrollWidth <= el.clientWidth);
      expect(fits, path).toBe(true);
      await expect(page.locator("header nav").first().locator("a[href*='anfrage'], a[href*='enquiry']")).toHaveCount(0);
    }
  });

  test("Links zur Anfrage: Footer, Kontakt, FAQ, Produktseite (mit Produkt)", async ({ page }) => {
    await gotoPage(page, "/kontakt");
    await expect(page.getByTestId("contact-custom-request")).toHaveAttribute("href", "/anfrage");
    await expect(page.locator("footer a[href='/anfrage']")).toHaveCount(1);
    await gotoPage(page, "/faq");
    await expect(page.getByTestId("faq-custom-request")).toHaveAttribute("href", "/anfrage");
    await gotoPage(page, "/produkt/amour");
    await expect(page.getByTestId("pdp-custom-request")).toHaveAttribute("href", "/anfrage?produkt=amour");
    await gotoPage(page, "/en/product/amour");
    await expect(page.getByTestId("pdp-custom-request")).toHaveAttribute("href", "/en/enquiry?produkt=amour");
    await expect(page.locator("footer a[href='/en/enquiry']")).toHaveCount(1);
  });
});
