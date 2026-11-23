import { expect, test, type Locator, type Page } from "@playwright/test";
import { gotoPage, seedCart } from "./helpers";

/** Links from content/settings.json (the overlay fixtures keep the repository settings). */
const WHATSAPP = "https://wa.me/message/VAQJPN3JVT53A1";
const PROFILES = {
  instagram: "https://www.instagram.com/blumora.at/",
  x: "https://x.com/blumora_at",
  linkedin: "https://at.linkedin.com/in/blumora-at-b98149451",
};

const fab = (page: Page) => page.getByTestId("floating-whatsapp");

type Box = { x: number; y: number; width: number; height: number };
const intersects = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

/** The floating button is either not usable (hidden/faded) or does not touch `other`. */
async function expectNoOverlap(page: Page, other: Locator) {
  // The button re-measures on the next frame after scroll/transition – let it settle.
  await page.waitForTimeout(450);
  const button = fab(page);
  if ((await button.count()) === 0) return;
  const faded = await button.evaluate((el) => getComputedStyle(el).opacity === "0" || el.getAttribute("aria-hidden") === "true");
  if (faded) return;
  const [a, b] = [await button.boundingBox(), await other.boundingBox()];
  expect(a, "floating button box").not.toBeNull();
  expect(b, "other element box").not.toBeNull();
  expect(intersects(a!, b!), `floating button ${JSON.stringify(a)} overlaps ${JSON.stringify(b)}`).toBe(false);
}

async function expectNoHorizontalOverflow(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll).toBeLessThanOrEqual(client);
}

test.describe("WhatsApp & social links", () => {
  test("floating WhatsApp button on shop pages, opening wa.me in a new tab", async ({ page }) => {
    for (const path of ["/", "/produkt/amour", "/kontakt"]) {
      await gotoPage(page, path);
      const button = fab(page);
      await expect(button, path).toBeVisible();
      await expect(button).toHaveAttribute("href", WHATSAPP);
      await expect(button).toHaveAttribute("target", "_blank");
      await expect(button).toHaveAttribute("rel", /noopener/);
      await expect(button).toHaveAccessibleName(/WhatsApp/);
    }
  });

  test("no floating button in the checkout, one small WhatsApp line instead", async ({ page }) => {
    await seedCart(page);
    await gotoPage(page, "/checkout");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(fab(page)).toHaveCount(0);
    const line = page.getByTestId("checkout-whatsapp");
    await expect(line).toContainText("Fragen?");
    await expect(line.getByRole("link")).toHaveAttribute("href", WHATSAPP);
    await expect(line).toContainText("WhatsApp 24/7");

    await gotoPage(page, "/checkout/rueckkehr");
    await expect(fab(page)).toHaveCount(0);
  });

  test("footer links Instagram, X, LinkedIn and WhatsApp", async ({ page }) => {
    await gotoPage(page, "/");
    const nav = page.getByRole("contentinfo").getByRole("navigation", { name: "Social Media" });
    const links = nav.getByRole("link");
    await expect(links).toHaveCount(4);
    const expected = [["instagram", PROFILES.instagram], ["x", PROFILES.x], ["linkedin", PROFILES.linkedin], ["whatsapp", WHATSAPP]];
    for (const [i, [key, href]] of expected.entries()) {
      const link = links.nth(i);
      await expect(link).toHaveAttribute("data-social", key);
      await expect(link).toHaveAttribute("href", href);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      const box = await link.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await expect(nav.getByRole("link", { name: /^Instagram/ })).toBeVisible();
    expect(await page.content()).not.toMatch(/trustpilot/i);
  });

  test("WhatsApp and Instagram on home, contact, FAQ and about page; sameAs in JSON-LD", async ({ page }) => {
    await gotoPage(page, "/");
    await expect(page.getByTestId("hero-whatsapp")).toHaveText(/WhatsApp-Support rund um die Uhr/);
    await expect(page.getByTestId("hero-whatsapp")).toHaveAttribute("href", WHATSAPP);
    await expect(page.getByRole("heading", { name: "Folge uns auf Instagram" })).toBeVisible();
    await expect(page.getByTestId("instagram-follow")).toHaveAttribute("href", PROFILES.instagram);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    const org = ld.map((s) => JSON.parse(s)).find((d) => d["@type"] === "OnlineStore");
    expect(org.sameAs).toEqual([PROFILES.instagram, PROFILES.x, PROFILES.linkedin]);

    await gotoPage(page, "/kontakt");
    const contact = page.getByTestId("contact-whatsapp");
    await expect(contact).toHaveText(/Per WhatsApp schreiben/);
    await expect(contact).toHaveAttribute("href", WHATSAPP);
    // Before the form.
    const [cta, form] = [await contact.boundingBox(), await page.locator("#contact-form-heading").boundingBox()];
    if (form) expect(cta!.y).toBeLessThan(form.y);

    await gotoPage(page, "/faq");
    await expect(page.getByTestId("faq-whatsapp")).toHaveText("Deine Frage war nicht dabei? Schreib uns auf WhatsApp (öffnet in neuem Tab) – rund um die Uhr.");
    await expect(page.getByTestId("faq-whatsapp").getByRole("link")).toHaveAttribute("href", WHATSAPP);

    await gotoPage(page, "/ueber-uns");
    await expect(page.getByTestId("instagram-follow")).toHaveAttribute("href", PROFILES.instagram);
  });
});

test.describe("WhatsApp button on a phone (390 × 844)", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("no horizontal overflow, also in Arabic (button on the left)", async ({ page }) => {
    for (const path of ["/", "/kontakt", "/produkt/amour", "/ar"]) {
      await gotoPage(page, path);
      await expect(fab(page), path).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
    // RTL: the button sits bottom-left.
    const box = await fab(page).boundingBox();
    expect(box!.x).toBeLessThan(390 / 2);
    await gotoPage(page, "/");
    expect((await fab(page).boundingBox())!.x).toBeGreaterThan(390 / 2);
  });

  test("never covers the product page's 'In den Warenkorb' buttons", async ({ page }) => {
    await gotoPage(page, "/produkt/amour");
    await expect(page.getByRole("heading", { level: 1, name: "Amour" })).toBeVisible();
    // Top of the page: the sticky bar is shown, the button sits above it.
    const sticky = page.locator("[data-fab-lift]").getByRole("button", { name: "In den Warenkorb" });
    await expect(sticky).toBeInViewport();
    await expectNoOverlap(page, sticky);
    await expectNoOverlap(page, page.locator("[data-fab-lift]"));
    await expect(fab(page)).toBeVisible();
    await expect(fab(page)).toHaveCSS("opacity", "1");
    // Lifted: its bottom edge is above the sticky bar.
    expect((await fab(page).boundingBox())!.y + (await fab(page).boundingBox())!.height).toBeLessThanOrEqual((await page.locator("[data-fab-lift]").boundingBox())!.y);

    // Scroll the in-page CTA through the bottom of the screen.
    const inline = page.locator("[data-fab-avoid]").getByRole("button", { name: "In den Warenkorb" });
    for (const block of ["end", "center", "start"] as const) {
      await inline.evaluate((el, b) => el.scrollIntoView({ block: b }), block);
      await expectNoOverlap(page, inline);
      if (await sticky.isVisible()) await expectNoOverlap(page, sticky);
    }
  });

  test("hides while the cart drawer is open and never covers its footer", async ({ page }) => {
    await seedCart(page);
    await gotoPage(page, "/");
    await expect(fab(page)).toBeVisible();
    await page.getByRole("button", { name: /Warenkorb, 1 Artikel/ }).click();
    const footer = page.getByTestId("cart-drawer-footer");
    await expect(footer).toBeVisible();
    await expect(fab(page)).toHaveCount(0);
    await expectNoOverlap(page, footer);
    await page.keyboard.press("Escape");
    await expect(footer).toBeHidden();
    await expect(fab(page)).toBeVisible();
  });
});
