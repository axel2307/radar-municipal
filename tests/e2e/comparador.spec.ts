import { test, expect } from "@playwright/test";

const BAHIA_ID = "060056";
const MAR_DEL_PLATA_ID = "060357"; // General Pueyrredón (Mar del Plata)

test.describe("Comparador", () => {
  test("loads from URL params and renders both municipios", async ({ page }) => {
    await page.goto(`/comparador?a=${BAHIA_ID}&b=${MAR_DEL_PLATA_ID}`);

    // El page title/heading debe estar
    await expect(
      page.getByRole("heading", { level: 1, name: /Comparador/i }),
    ).toBeVisible();

    // Los 3 selects (A, B, C) existen
    const selects = page.locator("select");
    await expect(selects).toHaveCount(3);

    // Select A debe tener pre-seleccionado Bahía Blanca (o al menos el value)
    await expect(selects.nth(0)).toHaveValue(BAHIA_ID);
    await expect(selects.nth(1)).toHaveValue(MAR_DEL_PLATA_ID);

    // Comparison view should reveal at least one radar chart or score table
    await expect(page.locator("svg.recharts-surface").first()).toBeVisible();
  });

  test("selecting a municipio updates the URL", async ({ page }) => {
    await page.goto("/comparador");

    const selectA = page.locator("select").nth(0);
    await selectA.selectOption(BAHIA_ID);

    // URL should now include ?a=060056
    await expect.poll(() => page.url(), { timeout: 2_000 }).toMatch(/a=060056/);
  });

  test("empty comparador shows hint", async ({ page }) => {
    await page.goto("/comparador");
    // Before selecting two municipios, no radar should be visible
    await expect(page.locator("svg.recharts-surface")).toHaveCount(0);
  });
});
