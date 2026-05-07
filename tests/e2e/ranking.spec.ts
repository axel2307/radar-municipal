import { test, expect } from "@playwright/test";

test.describe("Ranking", () => {
  test("lists the 13 pilot municipios", async ({ page }) => {
    await page.goto("/ranking");

    // One row per pilot municipio. Each row exposes a link to its detail page.
    const rows = page.locator('a[href^="/municipios/"]');
    await expect.poll(async () => rows.count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(13);

    // Spot-check: one of the pilots we always ship with data
    await expect(page.getByRole("link", { name: "Bahía Blanca" })).toBeVisible();
  });

  test("filters by text query", async ({ page }) => {
    await page.goto("/ranking");

    const search = page.getByPlaceholder(/Buscar municipio/i);
    await search.fill("bahía");

    // After filtering, we expect a single visible pilot-detail link for Bahía Blanca.
    const visibleLinks = page.locator('a[href^="/municipios/"]:visible');
    await expect
      .poll(async () => visibleLinks.count(), { timeout: 5_000 })
      .toBeLessThanOrEqual(2); // allow for partido link duplication

    await expect(page.getByRole("link", { name: "Bahía Blanca" })).toBeVisible();

    // Counter should surface "Mostrando X de Y municipios" once filtered
    await expect(page.getByText(/Mostrando \d+ de \d+ municipios/i)).toBeVisible();
  });

  test("empty search query shows all rows again", async ({ page }) => {
    await page.goto("/ranking");
    const search = page.getByPlaceholder(/Buscar municipio/i);

    await search.fill("zzzzzzzzz");
    await search.fill("");

    await expect(page.getByRole("link", { name: "Bahía Blanca" })).toBeVisible();
  });
});
