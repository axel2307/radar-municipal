import { test, expect } from "@playwright/test";

/**
 * Sprint 47E — E2E del CommandPalette (Sprint 45A).
 *
 * Verifica:
 *   - ⌘K / Ctrl+K abre el modal
 *   - ESC cierra
 *   - El input recibe foco al abrir
 *   - Búsqueda fuzzy retorna resultados expected (municipios, dimensiones,
 *     páginas, métricas)
 *   - Enter navega al primer resultado
 */

test.describe("Command Palette ⌘K", () => {
  test("se abre con Ctrl+K", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+K");
    await expect(page.getByRole("dialog", { name: /Buscar/i })).toBeVisible();
    await expect(
      page.getByPlaceholder(/Buscar municipio, dimensión, página/i),
    ).toBeFocused();
  });

  test("ESC cierra el palette", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+K");
    await expect(page.getByRole("dialog", { name: /Buscar/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: /Buscar/i }),
    ).not.toBeVisible();
  });

  test("busca municipios por nombre normalizado", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+K");
    await page.keyboard.type("Bahia");
    // Normalize de acentos: "Bahia" matches "Bahía Blanca"
    await expect(
      page.getByRole("option", { name: /Bahía Blanca/i }).first(),
    ).toBeVisible();
  });

  test("Enter sobre primer resultado navega", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+K");
    await page.keyboard.type("Bahia");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/municipios\/060056/);
  });

  test("encuentra páginas + dimensiones + métricas", async ({ page }) => {
    await page.goto("/");

    // Página
    await page.keyboard.press("Control+K");
    await page.keyboard.type("ranking");
    await expect(
      page.getByRole("option", { name: /Página.+Ranking/i }).first(),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    // Dimensión
    await page.keyboard.press("Control+K");
    await page.keyboard.type("transparencia");
    await expect(
      page.getByRole("option", { name: /Dimensión.+Transparencia/i }).first(),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    // Métrica del mapa
    await page.keyboard.press("Control+K");
    await page.keyboard.type("pesos por km");
    await expect(
      page
        .getByRole("option", { name: /Métrica del mapa.+Pesos por km/i })
        .first(),
    ).toBeVisible();
  });
});
