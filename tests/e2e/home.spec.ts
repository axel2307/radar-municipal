import { test, expect } from "@playwright/test";

test.describe("Home (post-Sprint 41-46)", () => {
  test("renders hero con CTAs Ranking · Mapa · Metodología", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: /Radar Municipal/i }),
    ).toBeVisible();

    // Sprint 41A — hero ahora tiene 3 CTAs (no 2). Mapa es el primary visual.
    await expect(
      page.getByRole("link", { name: "Ver ranking", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Explorar mapa", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Metodología", exact: true }).first(),
    ).toBeVisible();
  });

  test("muestra stats bar con counts", async ({ page }) => {
    await page.goto("/");
    // 4 cards en stats bar — "135 Municipios bonaerenses"
    await expect(page.getByText(/Municipios bonaerenses/i)).toBeVisible();
    await expect(page.getByText(/Piloto con scoring completo/i)).toBeVisible();
    await expect(page.getByText(/Dimensiones de análisis/i)).toBeVisible();
  });

  test("sección '¿Qué buscás?' surfacea las 6 navegaciones", async ({ page }) => {
    await page.goto("/");
    // Sprint 46 — wayfinding cards. Cada label debe estar accesible.
    await expect(
      page.getByRole("heading", { name: /¿Qué buscás\?/i }),
    ).toBeVisible();
    for (const label of [
      "Tu municipio",
      "Comparar 2-3 municipios",
      "Mirada provincial",
      "¿Cuánto pago de impuestos?",
      "Licitaciones públicas",
      "Para tu blog o medio",
    ]) {
      await expect(page.getByRole("heading", { name: label })).toBeVisible();
    }
  });

  test("CTA hero Ranking navega a /ranking", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Ver ranking", exact: true }).click();

    await expect(page).toHaveURL(/\/ranking$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Ranking de municipios/i }),
    ).toBeVisible();
  });

  test("expone OpenGraph image metadata", async ({ page }) => {
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
