import { test, expect } from "@playwright/test";

test.describe("Home", () => {
  test("renders hero with main CTAs", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: /Radar Municipal/i }),
    ).toBeVisible();

    // Hero CTAs: scope via the exact button labels so we don't collide
    // with the copies in the navbar and footer.
    await expect(
      page.getByRole("link", { name: "Ver ranking", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Conocer la metodología", exact: true }),
    ).toBeVisible();
  });

  test("primary CTA navigates to /ranking", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Ver ranking", exact: true }).click();

    await expect(page).toHaveURL(/\/ranking$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Ranking de municipios/i }),
    ).toBeVisible();
  });

  test("exposes OpenGraph image metadata", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();

    const og = await page
      .locator('meta[property="og:image"]')
      .first()
      .getAttribute("content");
    expect(og, "og:image meta should point to a generated image").toBeTruthy();
    expect(og!).toMatch(/opengraph-image/);
  });
});
