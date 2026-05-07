import { test, expect } from "@playwright/test";

test.describe("Presión impositiva", () => {
  test("renders heading, stats and table for 13 piloto", async ({ page }) => {
    const response = await page.goto("/presion-impositiva");
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { level: 1, name: /Presión impositiva/i }),
    ).toBeVisible();

    // El banner metodológico con la leyenda "pendiente auditoría" es parte
    // del contrato UX: no debería desaparecer silenciosamente en una refactor.
    await expect(page.getByText(/pendiente auditoría/i)).toBeVisible();

    // Al menos uno de los 13 piloto debe aparecer linkeado a su ficha.
    await expect(
      page.getByRole("link", { name: /Bahía Blanca/i }).first(),
    ).toBeVisible();

    // Debería mostrarse el conteo "Mostrando X de 135 municipios"
    await expect(page.getByText(/Mostrando \d+ de 135/i)).toBeVisible();
  });

  test("switching caso testigo tab reorders the table", async ({ page }) => {
    await page.goto("/presion-impositiva");

    // Por defecto el tab activo es "Índice global". Cambiamos a "Vivienda".
    await page.getByRole("button", { name: "Vivienda", exact: true }).click();

    // Cambiar a vivienda debería actualizar el header de la tabla.
    await expect(
      page.getByRole("button", { name: /Vivienda \(ABL\/TSG\)/i }),
    ).toBeVisible();
  });

  test("exposes Dataset JSON-LD with temporalCoverage", async ({ page }) => {
    await page.goto("/presion-impositiva");

    const jsonLdHandles = await page
      .locator('script[type="application/ld+json"]')
      .all();
    expect(jsonLdHandles.length).toBeGreaterThan(0);

    const payloads = await Promise.all(
      jsonLdHandles.map((h) => h.textContent()),
    );
    const parsed = payloads
      .filter((t): t is string => typeof t === "string" && t.length > 0)
      .map((t) => {
        try {
          return JSON.parse(t);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const dataset = parsed.find((obj) => obj?.["@type"] === "Dataset");
    expect(
      dataset,
      "Expected a Dataset JSON-LD block on /presion-impositiva",
    ).toBeDefined();
    expect(dataset?.name).toMatch(/Presión impositiva/i);
    expect(dataset?.temporalCoverage).toBeTruthy();
  });
});
