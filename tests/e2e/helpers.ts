import { expect, type Page } from "@playwright/test";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "test1234";

/** Postal codes used across the suite – taken from content/delivery-zones.json. */
export const PLZ_SERVED = "1040"; // Wien Zentrum
export const PLZ_NOT_SERVED = "8010"; // Graz – outside every zone

/**
 * The consent sheet is non-modal, but it overlaps the bottom of the viewport.
 * Accept only the necessary cookies so it never intercepts a click.
 */
export async function dismissConsent(page: Page) {
  const btn = page.getByRole("button", { name: "Nur notwendige" });
  try {
    await btn.waitFor({ state: "visible", timeout: 2_000 });
    await btn.click({ timeout: 5_000 });
    await expect(btn).toBeHidden({ timeout: 5_000 });
  } catch {
    /* no banner (already decided or feature removed) */
  }
}

export async function gotoPage(page: Page, url: string) {
  await page.goto(url);
  await dismissConsent(page);
}

/**
 * Configures Amour on the product page (Large, PLZ, first available date, message)
 * and adds it to the cart. Returns once the cart drawer shows the line.
 */
export async function addAmourToCart(page: Page, opts: { message?: string } = {}) {
  await gotoPage(page, "/produkt/amour");
  await expect(page.getByRole("heading", { level: 1, name: "Amour" })).toBeVisible();

  await page.getByRole("radio", { name: /Large/ }).check({ force: true });

  const form = page.getByRole("form", { name: "Lieferprüfung" });
  await form.getByPlaceholder("PLZ des Empfängers").fill(PLZ_SERVED);
  await form.getByRole("button", { name: "Prüfen" }).click();
  await expect(page.getByText("Wir liefern an diese Adresse.")).toBeVisible();

  // Open the calendar and pick the first selectable day.
  await page.getByRole("radio", { name: "Datum wählen" }).click();
  const grid = page.getByRole("grid");
  await expect(grid).toBeVisible();
  const firstDay = grid.locator("button:not([aria-disabled='true'])").first();
  const dayLabel = await firstDay.getAttribute("aria-label");
  await firstDay.click();
  await expect(page.getByText(/^Lieferung am/)).toBeVisible();

  if (opts.message) {
    await page.getByRole("button", { name: /Persönliche Nachricht hinzufügen/ }).click();
    await page.getByLabel("Deine Nachricht").fill(opts.message);
  }

  await page.getByRole("button", { name: "In den Warenkorb" }).first().click();
  const drawer = page.getByRole("dialog", { name: /Warenkorb/ });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("article", { name: /Amour, Large/ })).toBeVisible();
  return { dayLabel };
}

/** A persisted cart entry in the shape of the Zustand `boquetterie-cart` store. */
export function cartStorageValue() {
  return JSON.stringify({
    state: {
      items: [
        {
          id: "e2e-item",
          productId: "p-amour",
          sizeId: "m",
          quantity: 1,
          postalCode: PLZ_SERVED,
          extras: [],
          snapshot: {
            slug: "amour", name: "Amour", tagline: "Rote Gartenrosen & Eukalyptus", image: "/images/products/amour-1.jpg",
            sizeLabel: "Medium", unitPrice: 64.9, sameDayCapable: true,
          },
        },
      ],
      coupon: null,
    },
    version: 0,
  });
}

/** Seeds the cart before the first navigation, so pages that need an item render it immediately. */
export async function seedCart(page: Page) {
  const value = cartStorageValue();
  await page.addInitScript((v) => {
    try { window.localStorage.setItem("boquetterie-cart", v); } catch { /* ignore */ }
  }, value);
}
