import { test, expect } from "@playwright/test";

test.describe("Dimensiones", () => {
  test("dimensions index links to individual dimension pages", async ({ page }) => {
    await page.goto("/dimensiones");

    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toBeVisible();

    // Should have at least one link to an individual dimension page
    const dimLinks = page.locator('a[href^="/dimensiones/"]');
    await expect
      .poll(async () => dimLinks.count(), { timeout: 5_000 })
      .toBeGreaterThanOrEqual(1);
  });

  test("transparencia dimension ranks pilot municipios", async ({ page }) => {
    const response = await page.goto("/dimensiones/transparencia");
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { level: 1, name: /Transparencia/i }),
    ).toBeVisible();

    // Should show at least one pilot municipio link
    await expect(
      page.locator('a[href^="/municipios/"]').first(),
    ).toBeVisible();
  });

  test("unknown dimension slug renders not-found", async ({ page }) => {
    // The page calls notFound() for unknown slugs. `next start` against an
    // output:standalone build can serve this as 200 with the not-found UI,
    // so we accept either a 404 status or the not-found UI content.
    const response = await page.goto("/dimensiones/no-existe-esta-dimension");
    const status = response?.status() ?? 0;
    if (status === 404) return;

    // Otherwise, the built-in not-found UI should be visible.
    await expect(
      page.locator("body").getByText(/no.*encontr|not found|404/i).first(),
    ).toBeVisible();
  });
});
