import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { gotoPage, seedCart } from "../helpers";

/**
 * Accessibility gate: every page below must be free of serious/critical axe
 * violations (WCAG 2.x A/AA rule sets). Moderate/minor findings are attached to
 * the report as annotations so they stay visible without failing the build.
 */
const PAGES: { path: string; name: string; withCart?: boolean; prepare?: (page: Page) => Promise<void> }[] = [
  { path: "/", name: "Startseite" },
  { path: "/blumen", name: "Shop" },
  { path: "/produkt/amour", name: "Produktseite" },
  { path: "/warenkorb", name: "Warenkorb (mit Artikel)", withCart: true },
  { path: "/checkout", name: "Checkout Schritt 1", withCart: true },
  { path: "/faq", name: "FAQ" },
  { path: "/lieferung", name: "Lieferung" },
  { path: "/anlaesse/geburtstag", name: "Anlass Geburtstag" },
];

const GATE = new Set(["serious", "critical"]);

/**
 * Regions with known serious findings that live outside the storefront components
 * covered by this pass (see docs/TESTING.md, "Offene Punkte"). They are excluded
 * from the gate so the build stays meaningful for everything else – remove an
 * entry as soon as the underlying file is fixed.
 */
// Selectors excluded from the scan for documented, not yet fixed findings (see docs/TESTING.md).
const KNOWN_ISSUES: Record<string, string[]> = {
  "*": [],
};

for (const entry of PAGES) {
  test(`${entry.name} (${entry.path}) hat keine schweren axe-Verstöße`, async ({ page }, testInfo) => {
    test.slow(); // axe scans plus a cold dev-server compile can exceed the default budget
    if (entry.withCart) await seedCart(page);
    await gotoPage(page, entry.path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (entry.withCart) await expect(page.getByText("Amour").first()).toBeAttached(); // cart hydrated (summary may be collapsed)
    // Let entrance animations (fade-up) finish – axe measures contrast on the rendered state.
    await page.waitForTimeout(800);

    let builder = new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .exclude("iframe");
    for (const selector of [...KNOWN_ISSUES["*"], ...(KNOWN_ISSUES[entry.path] ?? [])]) builder = builder.exclude(selector);
    const results = await builder.analyze();

    const gated = results.violations.filter((v) => GATE.has(v.impact ?? ""));
    const rest = results.violations.filter((v) => !GATE.has(v.impact ?? ""));

    for (const v of rest) {
      testInfo.annotations.push({
        type: `axe-${v.impact}`,
        description: `${v.id}: ${v.help} – ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`,
      });
    }
    await testInfo.attach("axe-results.json", { body: JSON.stringify(results.violations, null, 2), contentType: "application/json" });

    expect(
      gated.map((v) => `${v.impact} ${v.id} (${v.help}):\n  ${v.nodes.map((n) => n.target.join(" ")).join("\n  ")}`),
      "serious/critical axe violations",
    ).toEqual([]);
  });
}
