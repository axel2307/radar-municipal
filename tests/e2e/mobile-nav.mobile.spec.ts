import { test, expect } from "@playwright/test";

/**
 * Este archivo solo se ejecuta bajo el proyecto `mobile` definido en
 * playwright.config.ts (ver `testMatch`), que usa el device `Pixel 5`.
 */

test.describe("Mobile nav", () => {
  test("opens hamburger and navigates to ranking", async ({ page }) => {
    await page.goto("/");

    // El botón hamburger solo se muestra en md:hidden
    const hamburger = page.getByRole("button", { name: /Abrir menú/i });
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    // Scope to the banner to exclude the footer's copy of "Ranking".
    const drawer = page.getByRole("banner");
    const rankingLink = drawer.getByRole("link", { name: "Ranking", exact: true });
    await expect(rankingLink).toBeVisible();
    await rankingLink.click();

    await expect(page).toHaveURL(/\/ranking$/);
  });

  test("calidad-datos link is reachable from mobile menu", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Abrir menú/i }).click();

    // Scope to the banner (the mobile drawer lives inside the header,
    // whereas /dimensiones may expose a "Calidad de datos" card link
    // that would otherwise collide.)
    const drawer = page.getByRole("banner");
    const link = drawer.getByRole("link", { name: "Calidad de datos", exact: true });
    await expect(link).toBeVisible();
    await link.click();

    await expect(page).toHaveURL(/\/calidad-datos$/);
  });
});
