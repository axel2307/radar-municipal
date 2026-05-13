import { test, expect } from "@playwright/test";

/**
 * Sprint 47E — Tests de los 6 wayfinding cards del Sprint 46.
 *
 * Cada card en "¿Qué buscás?" navega a su destino correcto. Antes de
 * Sprint 46 estas páginas solo eran alcanzables vía footer; el test
 * defiende contra regresión.
 */

const WAYFINDING_DESTINATIONS = [
  { card: "Tu municipio", urlMatch: /\/municipios$/ },
  { card: "Comparar 2-3 municipios", urlMatch: /\/comparador$/ },
  { card: "Mirada provincial", urlMatch: /\/panorama$/ },
  { card: "¿Cuánto pago de impuestos?", urlMatch: /\/presion-impositiva$/ },
  { card: "Licitaciones públicas", urlMatch: /\/compras$/ },
  { card: "Para tu blog o medio", urlMatch: /\/embed$/ },
];

test.describe("Home wayfinding cards (Sprint 46)", () => {
  for (const { card, urlMatch } of WAYFINDING_DESTINATIONS) {
    test(`card "${card}" navega al destino correcto`, async ({ page }) => {
      await page.goto("/");
      // Las cards están envueltas en <Link>. El nombre accesible incluye el
      // h3 del card. Tomamos el primer link cuyo texto incluye el card title.
      await page
        .getByRole("link", { name: new RegExp(card, "i") })
        .first()
        .click();
      await expect(page).toHaveURL(urlMatch);
    });
  }

  test("tip card del ⌘K aparece en la sección", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Atajo:/)).toBeVisible();
    // El kbd visible "⌘K" y "Ctrl+K"
    await expect(page.locator("kbd").filter({ hasText: "⌘K" })).toBeVisible();
  });
});
